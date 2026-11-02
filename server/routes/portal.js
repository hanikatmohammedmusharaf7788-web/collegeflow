import { Router } from "express";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import AttendanceRecord from "../models/AttendanceRecord.js";
import AttendanceCheckinCode from "../models/AttendanceCheckinCode.js";
import Faculty from "../models/Faculty.js";
import FacultyReview from "../models/FacultyReview.js";
import Student from "../models/Student.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("student"));

async function getStudent(req) {
  return Student.findById(req.userId);
}

router.get("/faculty-reviews", async (req, res, next) => {
  try {
    const student = await getStudent(req);
    if (!student) return res.status(404).json({ message: "Student account not found." });
    const faculty = await Faculty.find({
      department: student.department,
      subjects: { $elemMatch: { year: student.year, section: student.section } },
    }).select("name facultyId subjects");
    const assignments = faculty.flatMap((person) => person.subjects
      .filter((subject) => subject.year === student.year && subject.section === student.section)
      .map((subject) => ({
        facultyId: String(person._id),
        facultyName: person.name,
        subject: subject.name,
        subjectCode: subject.code,
      })));
    const reviews = await FacultyReview.find({
      student: student._id,
      semester: student.semester,
    }).select("faculty subject clarity subjectKnowledge engagement support comment createdAt");
    const submitted = new Map(reviews.map((review) => [`${review.faculty}:${review.subject}`, review]));
    res.json({
      semester: student.semester,
      reviews: assignments.map((assignment) => ({
        ...assignment,
        submitted: submitted.get(`${assignment.facultyId}:${assignment.subject}`) || null,
      })),
    });
  } catch (error) { next(error); }
});

router.post("/faculty-reviews", async (req, res, next) => {
  try {
    const student = await getStudent(req);
    if (!student) return res.status(404).json({ message: "Student account not found." });
    const { facultyId, subject, ratings, comment = "" } = req.body || {};
    if (typeof facultyId !== "string" || !mongoose.isValidObjectId(facultyId) || typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ message: "Choose a valid faculty member and subject." });
    }
    if (!ratings || !["clarity", "subjectKnowledge", "engagement", "support"].every((key) => Number.isInteger(ratings[key]) && ratings[key] >= 1 && ratings[key] <= 5)) {
      return res.status(400).json({ message: "Rate each teaching category from 1 to 5 stars." });
    }
    if (typeof comment !== "string" || comment.trim().length > 1000) {
      return res.status(400).json({ message: "Feedback must be 1,000 characters or fewer." });
    }
    const teacher = await Faculty.findOne({
      _id: facultyId,
      department: student.department,
      subjects: { $elemMatch: { name: subject.trim(), year: student.year, section: student.section } },
    }).select("name facultyId subjects");
    if (!teacher) return res.status(400).json({ message: "You can only review faculty assigned to your class and subject." });
    const assignment = teacher.subjects.find((item) => item.name === subject.trim()
      && item.year === student.year && item.section === student.section);
    const review = await FacultyReview.create({
      student: student._id,
      reviewerRollNumber: student.rollNumber || student.studentId,
      faculty: teacher._id,
      facultyName: teacher.name,
      facultyId: teacher.facultyId,
      subject: assignment.name,
      subjectCode: assignment.code,
      department: student.department,
      year: student.year,
      section: student.section,
      semester: student.semester,
      clarity: ratings.clarity,
      subjectKnowledge: ratings.subjectKnowledge,
      engagement: ratings.engagement,
      support: ratings.support,
      comment: comment.trim(),
    });
    res.status(201).json({ message: "Your semester teaching review was submitted to the Admin portal.", reviewId: review._id });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You have already reviewed this faculty member for this subject this semester." });
    next(error);
  }
});

router.get("/dashboard", async (req, res, next) => {
  try {
    const student = await getStudent(req);
    if (!student) return res.status(404).json({ message: "Student account not found." });
    const [faculty, recordedAttendance] = await Promise.all([
      Faculty.find({
        department: student.department,
        subjects: { $elemMatch: { year: student.year, section: student.section } },
      }).select("name subjects"),
      AttendanceRecord.aggregate([
        { $match: { student: student._id } },
        { $group: {
          _id: "$subject",
          present: { $sum: { $cond: [{ $in: ["$status", ["Present", "Approved"]] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $in: ["$status", ["Absent", "Rejected"]] }, 1, 0] } },
        } },
      ]),
    ]);
    const assignmentBySubject = new Map();
    faculty.forEach((person) => person.subjects
      .filter((subject) => subject.year === student.year && subject.section === student.section)
      .forEach((subject) => assignmentBySubject.set(subject.name, subject)));
    const savedAttendance = new Map(student.attendance.map((item) => [item.subject, item]));
    const recordedCounts = new Map(recordedAttendance.map((item) => [item._id, item]));
    const attendance = [...assignmentBySubject.values()].map((subject) => {
      const saved = savedAttendance.get(subject.name);
      const recorded = recordedCounts.get(subject.name);
      return {
        subject: subject.name,
        code: subject.code,
        color: saved?.color || "#5278f5",
        present: recorded ? recorded.present : saved?.present || 0,
        absent: recorded ? recorded.absent : saved?.absent || 0,
      };
    });
    const attendanceCount = attendance.reduce((sum, item) => sum + item.present + item.absent, 0);
    const presentCount = attendance.reduce((sum, item) => sum + item.present, 0);
    const timetable = student.timetable.map((item) => item.toObject());
    faculty.forEach((person) => person.subjects
      .filter((subject) => subject.year === student.year && subject.section === student.section)
      .forEach((subject) => subject.days.forEach((day) => {
        const schedule = {
          subject: subject.name,
          day,
          startTime: subject.startTime,
          endTime: subject.endTime,
          room: subject.room,
          instructor: person.name,
        };
        const existingIndex = timetable.findIndex((item) => item.subject === subject.name && item.day === day);
        if (existingIndex >= 0) timetable[existingIndex] = schedule;
        else timetable.push(schedule);
      })));
    const totalMarks = student.marks.map((mark) => mark.internal + mark.external);
    const averageGpa = student.marks.length
      ? student.marks.reduce((sum, mark) => sum + mark.gpa, 0) / student.marks.length
      : 0;
    res.json({
      profile: {
        id: student._id,
        name: student.name,
        email: student.email,
        studentId: student.studentId,
        photo: student.photo,
        department: student.department,
        year: student.year,
        semester: student.semester,
        mobile: student.mobile,
      },
      stats: {
        attendance: attendanceCount ? Math.round((presentCount / attendanceCount) * 100) : 0,
        cgpa: Number(averageGpa.toFixed(1)),
        subjects: attendance.length,
        leaves: student.leaves.filter((item) => item.status === "Pending").length,
      },
      attendance,
      marks: student.marks,
      timetable,
      leaves: student.leaves,
      notifications: student.notifications,
      averageMarks: totalMarks.length
        ? Math.round(totalMarks.reduce((sum, value) => sum + value, 0) / totalMarks.length)
        : 0,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/profile", async (req, res, next) => {
  try {
    const student = await getStudent(req);
    if (!student) return res.status(404).json({ message: "Student account not found." });
    res.json(student.toObject({ transform: (_, ret) => { delete ret.password; return ret; } }));
  } catch (error) { next(error); }
});

router.put("/profile", async (req, res, next) => {
  try {
    const allowed = ["name", "photo", "mobile"];
    const updates = Object.fromEntries(allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
    const student = await Student.findByIdAndUpdate(req.userId, { $set: updates }, { new: true, runValidators: true }).select("-password");
    if (!student) return res.status(404).json({ message: "Student account not found." });
    res.json(student);
  } catch (error) { next(error); }
});

router.put("/profile/password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== "string" || !currentPassword || typeof newPassword !== "string") {
      return res.status(400).json({ message: "Current password and new password are required." });
    }
    if (newPassword.length < 8) return res.status(400).json({ message: "New password must be at least 8 characters." });

    const student = await Student.findById(req.userId).select("+password");
    if (!student) return res.status(404).json({ message: "Student account not found." });
    if (!(await bcrypt.compare(currentPassword, student.password))) {
      return res.status(400).json({ message: "Your current password is incorrect." });
    }

    student.password = await bcrypt.hash(newPassword, 12);
    student.tokenVersion = (student.tokenVersion || 0) + 1;
    await student.save();
    res.json({ message: "Password updated successfully." });
  } catch (error) { next(error); }
});

router.post("/attendance/code-checkin", async (req, res, next) => {
  try {
    const student = await getStudent(req);
    if (!student) return res.status(404).json({ message: "Student account not found." });
    const code = typeof req.body.code === "string" ? req.body.code.trim().toUpperCase() : "";
    if (!/^[A-Z0-9_-]{8}$/.test(code)) return res.status(400).json({ message: "Enter the 8-character attendance code from your instructor." });
    const codeHash = createHash("sha256").update(code).digest("hex");
    const challenge = await AttendanceCheckinCode.findOne({ codeHash, expiresAt: { $gt: new Date() } });
    if (!challenge) return res.status(400).json({ message: "That attendance code is invalid or expired." });
    if (challenge.department !== student.department || challenge.year !== student.year || challenge.section !== student.section) {
      return res.status(403).json({ message: "That code is not for your department, year, and section." });
    }
    if (typeof req.body.subject === "string" && req.body.subject !== challenge.subject) {
      return res.status(400).json({ message: "Choose the subject shown with your instructor’s attendance code." });
    }
    const faculty = await Faculty.findOne({
      _id: challenge.faculty,
      department: student.department,
      subjects: { $elemMatch: { name: challenge.subject, year: student.year, section: student.section } },
    });
    if (!faculty) return res.status(409).json({ message: "This instructor assignment is no longer active." });
    const now = new Date();
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let record = await AttendanceRecord.findOne({ student: student._id, subject: challenge.subject, date: { $gte: date, $lt: new Date(date.valueOf() + 86400000) } });
    if (record?.status === "Present" || record?.status === "Approved") {
      return res.json({ message: "Your attendance is already recorded for this subject today.", status: "Present", checkedInAt: record.updatedAt });
    }
    if (record?.status === "Rejected") {
      return res.status(409).json({ message: "Your attendance for this subject was rejected. Please contact your instructor." });
    }

    const previousStatus = record?.status;
    if (record) {
      record.status = "Present";
      record.checkIn = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
      record.faculty = faculty._id;
      await record.save();
    } else {
      try {
        record = await AttendanceRecord.create({
          student: student._id,
          faculty: faculty._id,
          subject: challenge.subject,
          date,
          checkIn: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }),
          status: "Present",
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        return res.status(409).json({ message: "Your attendance has already been submitted. Refresh your attendance page." });
      }
    }

    const summary = student.attendance.find((item) => item.subject.toLowerCase() === challenge.subject.toLowerCase());
    if (summary) {
      summary.present += 1;
      if (previousStatus === "Absent") summary.absent = Math.max(0, summary.absent - 1);
      await student.save();
    } else {
      student.attendance.push({ subject: challenge.subject, code: faculty.subjects.find((item) => item.name === challenge.subject)?.code || "", present: 1, absent: 0 });
      await student.save();
    }
    res.status(201).json({ message: "Attendance marked present.", status: "Present", checkedInAt: record.checkIn });
  } catch (error) { next(error); }
});

for (const collection of ["attendance", "marks", "timetable", "leaves", "notifications"]) {
  router.get(`/${collection}`, async (req, res, next) => {
    try {
      const student = await getStudent(req);
      if (!student) return res.status(404).json({ message: "Student account not found." });
      res.json(student[collection]);
    } catch (error) { next(error); }
  });
}

router.post("/leaves", async (req, res, next) => {
  try {
    const student = await getStudent(req);
    if (!student) return res.status(404).json({ message: "Student account not found." });
    const from = new Date(req.body.from);
    const to = new Date(req.body.to);
    if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || to < from) {
      return res.status(400).json({ message: "Choose a valid leave date range." });
    }
    if (typeof req.body.reason !== "string" || !req.body.reason.trim()) {
      return res.status(400).json({ message: "A reason for leave is required." });
    }
    const attachment = req.body.attachment;
    if (attachment && (!/^data:(application\/pdf|image\/jpeg|image\/png);base64,/.test(attachment) || attachment.length > 7 * 1024 * 1024)) {
      return res.status(400).json({ message: "Attachment must be a PDF, JPG, or PNG smaller than 5MB." });
    }
    const item = student.leaves.create({
      from,
      to,
      reason: req.body.reason.trim(),
      ...(attachment ? { attachment } : {}),
    });
    student.leaves.push(item);
    await student.save();
    res.status(201).json(item);
  } catch (error) { next(error); }
});

router.delete("/leaves/:itemId", async (req, res, next) => {
  try {
    const student = await getStudent(req);
    if (!student) return res.status(404).json({ message: "Student account not found." });
    const item = student.leaves.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Leave request not found." });
    if (item.status !== "Pending") return res.status(409).json({ message: "Only pending leave requests can be cancelled." });
    item.deleteOne();
    await student.save();
    res.json({ message: "Leave request cancelled." });
  } catch (error) { next(error); }
});

router.put("/notifications/:itemId", async (req, res, next) => {
  try {
    const student = await getStudent(req);
    if (!student) return res.status(404).json({ message: "Student account not found." });
    if (req.body.read !== true) return res.status(400).json({ message: "Notifications can only be marked as read." });
    const item = student.notifications.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Notification not found." });
    item.read = true;
    await student.save();
    res.json(item);
  } catch (error) { next(error); }
});

export default router;
