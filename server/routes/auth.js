import { Router } from "express";
import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import Admin from "../models/Admin.js";
import {
  accountCreationLimiter,
  passwordResetLimiter,
  passwordResetOtpLimiter,
  passwordResetRequestLimiter,
  signInLimiter,
} from "../middleware/rateLimit.js";
import { getClientUrl } from "../utils/clientUrl.js";
import { createMailTransport } from "../utils/mail.js";

const router = Router();

function issueToken(student) {
  return jwt.sign({ userId: student._id, role: "student", tokenVersion: student.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicStudent(student) {
  return {
    id: student._id,
    name: student.name,
    email: student.email,
    studentId: student.studentId,
    role: "student",
    photo: student.photo,
    department: student.department,
    year: student.year,
    semester: student.semester,
    mobile: student.mobile,
  };
}

function issueFacultyToken(faculty) {
  return jwt.sign({ userId: faculty._id, role: "faculty", tokenVersion: faculty.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicFaculty(faculty) {
  return {
    id: faculty._id,
    name: faculty.name,
    email: faculty.email,
    facultyId: faculty.facultyId,
    photo: faculty.photo,
    department: faculty.department,
    title: faculty.title,
    mobile: faculty.mobile,
    role: "faculty",
  };
}

async function sendPasswordResetEmail(account, role, mailTransport) {
  const token = randomBytes(32).toString("hex");
  account.passwordResetTokenHash = createHash("sha256").update(token).digest("hex");
  account.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  account.passwordResetOtpHash = undefined;
  account.passwordResetOtpExpiresAt = undefined;
  await account.save();

  const resetUrl = new URL("/reset-password", getClientUrl());
  resetUrl.searchParams.set("token", token);
  resetUrl.searchParams.set("role", role);
  await mailTransport.sendMail({
    from: process.env.SMTP_FROM,
    to: account.email,
    subject: `Reset your CampusFlow ${role} password`,
    text: `We received a request to reset your ${role} portal password. Use this link within one hour: ${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>We received a request to reset your ${role} portal password.</p><p><a href="${resetUrl.toString()}">Reset your password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`,
  });
}

function otpHash(role, email, code) {
  return createHmac("sha256", process.env.JWT_SECRET).update(`${role}:${email}:${code}`).digest("hex");
}

function recoveryIdentifier(body) {
  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const value = identifier || email;
  return value.includes("@")
    ? { email: value.toLowerCase() }
    : { studentId: value };
}

function maskRecoveryEmail(email) {
  const [localPart, domain] = email.split("@");
  const suffix = localPart.length > 2 ? localPart.slice(-2) : "";
  return `${localPart[0]}*****${suffix}@${domain}`;
}

function emailRecoveryQuery(email) {
  return typeof email === "string" ? { email: email.trim().toLowerCase() } : { email: "" };
}

async function recoveryOptions(req, res, next) {
  try {
    const query = recoveryIdentifier(req.body);
    if (!Object.values(query)[0]) {
      return res.status(400).json({ message: "Enter your registered College Email or Student ID." });
    }
    const student = await Student.findOne(query).select("email");
    if (!student) {
      return res.status(404).json({ message: "We couldn't verify those details. Check your College Email or Student ID and try again." });
    }
    res.json({ email: maskRecoveryEmail(student.email) });
  } catch (error) {
    next(error);
  }
}

function forgotPassword(Model, role) {
  return async (req, res, next) => {
    try {
      const query = Model === Student ? recoveryIdentifier(req.body) : emailRecoveryQuery(req.body.email);
      if (!Object.values(query)[0]) return res.status(400).json({ message: "Enter your registered College Email or Student ID." });

      const mailTransport = createMailTransport();
      const account = await Model.findOne(query);
      if (account) await sendPasswordResetEmail(account, role, mailTransport);

      res.json({ message: `If a ${role} account exists for that email, a password reset link has been sent.` });
    } catch (error) {
      if (error.code === "EMAIL_NOT_CONFIGURED") {
        console.error(error.message);
        return res.status(503).json({ message: "Password reset email is not set up yet. Please contact your portal administrator." });
      }
      next(error);
    }
  };
}

function sendPasswordOtp(Model, role) {
  return async (req, res, next) => {
    try {
      const query = Model === Student ? recoveryIdentifier(req.body) : emailRecoveryQuery(req.body.email);
      if (!Object.values(query)[0]) return res.status(400).json({ message: "Enter your registered College Email or Student ID." });

      const mailTransport = createMailTransport();
      const account = await Model.findOne(query);
      if (account) {
        const code = String(randomInt(100000, 1000000));
        account.passwordResetOtpHash = otpHash(role, account.email, code);
        account.passwordResetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        account.passwordResetTokenHash = undefined;
        account.passwordResetExpiresAt = undefined;
        await account.save();
        await mailTransport.sendMail({
          from: process.env.SMTP_FROM,
          to: account.email,
          subject: `Your CampusFlow ${role} verification code`,
          text: `Your CampusFlow verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
          html: `<p>Your CampusFlow verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. If you did not request this code, you can ignore this email.</p>`,
        });
      }

      res.json({ message: `If a ${role} account exists for that email, a verification code has been sent.` });
    } catch (error) {
      if (error.code === "EMAIL_NOT_CONFIGURED") {
        console.error(error.message);
        return res.status(503).json({ message: "Password recovery email is not set up yet. Please contact your portal administrator." });
      }
      next(error);
    }
  };
}

function verifyPasswordOtp(Model, role) {
  return async (req, res, next) => {
    try {
      const query = Model === Student ? recoveryIdentifier(req.body) : emailRecoveryQuery(req.body.email);
      const code = typeof req.body.code === "string" ? req.body.code : "";
      if (!Object.values(query)[0] || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ message: "Enter the 6-digit verification code sent to your recovery email." });
      }

      const account = await Model.findOne(query).select("+passwordResetOtpHash");
      const candidateHash = account ? otpHash(role, account.email, code) : otpHash(role, "", code);
      const storedHash = account?.passwordResetOtpHash;
      if (!/^[a-f0-9]{64}$/i.test(storedHash || "") || !timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(candidateHash, "hex"))) {
        return res.status(400).json({ message: "That verification code is invalid or has expired. Request a new code and try again." });
      }

      const token = randomBytes(32).toString("hex");
      const updated = await Model.findOneAndUpdate(
        {
          _id: account._id,
          passwordResetOtpHash: storedHash,
          passwordResetOtpExpiresAt: { $gt: new Date() },
        },
        {
          $set: {
            passwordResetTokenHash: createHash("sha256").update(token).digest("hex"),
            passwordResetExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
          $unset: { passwordResetOtpHash: 1, passwordResetOtpExpiresAt: 1 },
        },
        { new: true },
      );
      if (!updated) {
        return res.status(400).json({ message: "That verification code is invalid or has expired. Request a new code and try again." });
      }

      res.json({ token });
    } catch (error) {
      next(error);
    }
  };
}

async function resetPassword(Model, req, res, next) {
  try {
    const { token, password } = req.body;
    if (typeof token !== "string" || !token || typeof password !== "string") {
      return res.status(400).json({ message: "A valid reset link and new password are required." });
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return res.status(400).json({ message: "Password must include 8+ characters, an uppercase letter, a lowercase letter, a number, and a special character." });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const account = await Model.findOneAndUpdate(
      { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() } },
      {
        $set: {
          password: await bcrypt.hash(password, 12),
          ...(Model === Student ? { mustChangePassword: false } : {}),
        },
        $inc: { tokenVersion: 1 },
        $unset: {
          passwordResetTokenHash: 1,
          passwordResetExpiresAt: 1,
          passwordResetOtpHash: 1,
          passwordResetOtpExpiresAt: 1,
        },
      },
      { new: true, runValidators: true }
    );
    if (!account) return res.status(400).json({ message: "This password reset link is invalid or has expired. Request a new one." });
    res.json({ message: "Your password has been reset. You can now sign in." });
  } catch (error) {
    next(error);
  }
}

router.post("/student/recovery-options", passwordResetRequestLimiter, recoveryOptions);
router.post("/student/forgot-password", passwordResetRequestLimiter, forgotPassword(Student, "student"));
router.post("/faculty/forgot-password", passwordResetRequestLimiter, forgotPassword(Faculty, "faculty"));
router.post("/admin/forgot-password", passwordResetRequestLimiter, forgotPassword(Admin, "admin"));
router.post("/student/send-otp", passwordResetRequestLimiter, sendPasswordOtp(Student, "student"));
router.post("/faculty/send-otp", passwordResetRequestLimiter, sendPasswordOtp(Faculty, "faculty"));
router.post("/student/verify-otp", passwordResetOtpLimiter, verifyPasswordOtp(Student, "student"));
router.post("/faculty/verify-otp", passwordResetOtpLimiter, verifyPasswordOtp(Faculty, "faculty"));

router.post("/student/reset-password", passwordResetLimiter, (req, res, next) => resetPassword(Student, req, res, next));
router.post("/faculty/reset-password", passwordResetLimiter, (req, res, next) => resetPassword(Faculty, req, res, next));
router.post("/admin/reset-password", passwordResetLimiter, (req, res, next) => resetPassword(Admin, req, res, next));

router.post("/faculty/register", accountCreationLimiter, async (req, res, next) => {
  try {
    if (!process.env.FACULTY_INVITE_CODE || req.body.inviteCode !== process.env.FACULTY_INVITE_CODE) {
      return res.status(403).json({ message: "A valid faculty invitation code is required to create a faculty account." });
    }
    const { name, email, password, facultyId, department } = req.body;
    if (!name?.trim() || !email?.trim() || !password || !facultyId?.trim()) {
      return res.status(400).json({ message: "Name, email, faculty ID, and password are required." });
    }
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    const normalizedEmail = email.trim().toLowerCase();
    const [existingStudent, existingFaculty] = await Promise.all([
      Student.exists({ email: normalizedEmail }),
      Faculty.findOne({ $or: [{ email: normalizedEmail }, { facultyId: facultyId.trim() }] }),
    ]);
    if (existingStudent || existingFaculty) return res.status(409).json({ message: "That email or faculty ID is already registered." });

    const faculty = await Faculty.create({
      name: name.trim(),
      email: normalizedEmail,
      facultyId: facultyId.trim(),
      password: await bcrypt.hash(password, 12),
      department: department?.trim() || "Computer Science",
    });
    res.status(201).json({ token: issueFacultyToken(faculty), user: publicFaculty(faculty), role: "faculty" });
  } catch (error) {
    next(error);
  }
});

router.post("/faculty/login", signInLimiter, async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const faculty = await Faculty.findOne({ email }).select("+password");
    if (!faculty || !(await bcrypt.compare(req.body.password || "", faculty.password))) {
      return res.status(401).json({ message: "The email or password you entered is incorrect." });
    }
    res.json({ token: issueFacultyToken(faculty), user: publicFaculty(faculty), role: "faculty" });
  } catch (error) {
    next(error);
  }
});

router.post("/register", accountCreationLimiter, async (req, res, next) => {
  try {
    const { name, email, studentId, password } = req.body;
    if (!name?.trim() || !email?.trim() || !studentId?.trim() || typeof password !== "string") {
      return res.status(400).json({ message: "Name, email, student ID, and password are required." });
    }
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    const normalizedEmail = email.trim().toLowerCase();
    const [existing, existingFaculty] = await Promise.all([
      Student.findOne({ $or: [{ email: normalizedEmail }, { studentId: studentId.trim() }] }),
      Faculty.exists({ email: normalizedEmail }),
    ]);
    if (existing || existingFaculty) return res.status(409).json({ message: "That email or student ID is already registered." });

    const student = await Student.create({
      name: name.trim(),
      email: normalizedEmail,
      studentId: studentId.trim(),
      rollNumber: studentId.trim(),
      password: await bcrypt.hash(password, 12),
    });
    res.status(201).json({ token: issueToken(student), student: publicStudent(student) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", signInLimiter, async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const student = await Student.findOne({ email }).select("+password");
    if (!student || !(await bcrypt.compare(req.body.password || "", student.password))) {
      return res.status(401).json({ message: "The email or password you entered is incorrect." });
    }
    if (student.mustChangePassword) {
      return res.status(403).json({ code: "PASSWORD_CHANGE_REQUIRED", message: "For account safety, reset your password using the link sent to your college email." });
    }
    res.json({ token: issueToken(student), student: publicStudent(student) });
  } catch (error) {
    next(error);
  }
});

export default router;
