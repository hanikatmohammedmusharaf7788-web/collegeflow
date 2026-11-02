import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import AdminSetting from "../models/AdminSetting.js";
import AcademicItem from "../models/AcademicItem.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import Faculty from "../models/Faculty.js";
import FacultyAttendance from "../models/FacultyAttendance.js";
import FacultyReview from "../models/FacultyReview.js";
import Student from "../models/Student.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { signInLimiter } from "../middleware/rateLimit.js";

const router = Router();
const protectedRouter = Router();
protectedRouter.use(requireAuth, requireRole("admin"));

function parseSubjectAssignment(body) {
  const {
    name, code, year, section, room = "Room 204",
    days = ["Monday", "Wednesday"], startTime = "09:00", endTime = "10:00",
  } = body;
  if (![name, code, year, section].every((value) => typeof value === "string" && value.trim())) {
    return { error: "Subject name, code, year, and section are required." };
  }
  if (typeof room !== "string" || room.length > 60 || name.trim().length > 100 || code.trim().length > 30) {
    return { error: "Subject name, code, or room exceeds its maximum length." };
  }
  if (!["1st Year", "2nd Year", "3rd Year", "4th Year"].includes(year.trim())
    || !["A", "B", "C", "D"].includes(section.trim())) {
    return { error: "Choose a valid year and section." };
  }
  if (!Array.isArray(days) || !days.length
    || days.some((day) => !["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(day))
    || typeof startTime !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)
    || typeof endTime !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(endTime)
    || startTime >= endTime) {
    return { error: "Enter valid class days, room, and a time range where the end is after the start." };
  }
  return {
    assignment: {
      name: name.trim(),
      code: code.trim(),
      year: year.trim(),
      section: section.trim(),
      room: room.trim(),
      days: [...new Set(days)],
      startTime,
      endTime,
    },
  };
}

function publicAdmin(admin) {
  return { id: admin._id, name: admin.name, email: admin.email, role: "admin" };
}

router.post("/login", signInLimiter, async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin || !(await bcrypt.compare(req.body.password || "", admin.password))) {
      return res.status(401).json({ message: "The email or password you entered is incorrect." });
    }
    const token = jwt.sign({ userId: admin._id, role: "admin", tokenVersion: admin.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: publicAdmin(admin), role: "admin" });
  } catch (error) { next(error); }
});

protectedRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const [students, faculty, departments, courses, studentLeaves, facultyLeaves, studentAttendance, facultyAttendance, classAttendance] = await Promise.all([
      Student.find().select("createdAt department attendance"),
      Faculty.find().select("name createdAt department subjects"),
      AcademicItem.countDocuments({ type: "Department" }),
      AcademicItem.countDocuments({ type: "Course" }),
      Student.find({ "leaves.status": "Pending" }).select("leaves"),
      Faculty.find({ "leaves.status": "Pending" }).select("leaves"),
      Student.find().select("attendance"),
      FacultyAttendance.find().select("status date"),
      AttendanceRecord.find().select("faculty status date").populate("faculty", "name"),
    ]);
    const averageAttendance = (items) => {
      const total = items.reduce((sum, item) => sum + (item.present || 0) + (item.absent || 0), 0);
      const present = items.reduce((sum, item) => sum + (item.present || 0), 0);
      return total ? Math.round((present / total) * 100) : 0;
    };
    const monthly = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      const month = date.toLocaleString("en", { month: "short" });
      const monthNumber = date.getMonth();
      const yearNumber = date.getFullYear();
      const monthRecords = (records) => records.filter((record) => {
        const created = new Date(record.createdAt || record.date);
        return created.getMonth() === monthNumber && created.getFullYear() === yearNumber;
      });
      const studentRecords = monthRecords(classAttendance);
      const facultyRecords = monthRecords(facultyAttendance);
      const attendancePercent = (records) => records.length
        ? Math.round((records.filter((record) => ["Present", "Approved", "Late"].includes(record.status)).length / records.length) * 100)
        : 0;
      return {
        month,
        students: students.filter((item) => {
          const created = new Date(item.createdAt);
          return created.getMonth() === monthNumber && created.getFullYear() === yearNumber;
        }).length,
        faculty: faculty.filter((item) => {
          const created = new Date(item.createdAt);
          return created.getMonth() === monthNumber && created.getFullYear() === yearNumber;
        }).length,
        studentAttendance: attendancePercent(studentRecords),
        facultyAttendance: attendancePercent(facultyRecords),
      };
    });
    const departmentNames = await AcademicItem.find({ type: "Department" }).select("name");
    const departmentStats = departmentNames.map(({ name }) => ({
      name,
      students: students.filter((item) => item.department === name).length,
    }));
    const pending = (rows) => rows.reduce((sum, row) => sum + row.leaves.filter((item) => item.status === "Pending").length, 0);
    const facultyPresent = facultyAttendance.filter((record) => ["Present", "Late"].includes(record.status)).length;
    const facultyPerformance = faculty.map((person) => {
      const records = classAttendance.filter((record) => record.faculty?._id.toString() === person._id.toString());
      const completed = records.filter((record) => ["Present", "Approved"].includes(record.status)).length;
      return { name: person.name.split(" ")[0], performance: records.length ? Math.round((completed / records.length) * 100) : 0 };
    }).filter((item) => item.performance > 0).slice(0, 5);
    res.json({
      stats: {
        students: students.length,
        faculty: faculty.length,
        departments,
        courses,
        studentAttendance: averageAttendance(studentAttendance.flatMap((item) => item.attendance)),
        facultyAttendance: facultyAttendance.length ? Math.round((facultyPresent / facultyAttendance.length) * 100) : 0,
        pendingLeaves: pending(studentLeaves) + pending(facultyLeaves),
      },
      growth: monthly,
      departments: departmentStats,
      attendance: monthly.map((item) => ({ month: item.month, students: item.studentAttendance, faculty: item.facultyAttendance })),
      performance: facultyPerformance,
      recentStudents: await Student.find().sort({ createdAt: -1 }).limit(5).select("name studentId department year createdAt"),
    });
  } catch (error) { next(error); }
});

const studentFields = ["name", "email", "studentId", "rollNumber", "department", "year", "semester", "section", "mobile"];
const facultyFields = ["name", "email", "facultyId", "department", "title", "mobile"];
function pickFields(body, fields) {
  return Object.fromEntries(fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
}
function safeRecord(record, fields) {
  return Object.fromEntries(["_id", ...fields, "createdAt"].map((field) => [field, record[field]]));
}

for (const [path, Model, fields, idField] of [
  ["students", Student, studentFields, "studentId"],
  ["faculty", Faculty, facultyFields, "facultyId"],
]) {
  protectedRouter.get(`/${path}`, async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.department) filter.department = req.query.department;
      if (req.query.search) {
        const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = ["name", idField, "email"].map((key) => ({ [key]: { $regex: escaped, $options: "i" } }));
      }
      if (path === "students" && req.query.year) filter.year = req.query.year;
      const rows = await Model.find(filter).sort({ createdAt: -1 });
      res.json(rows.map((row) => ({
        ...safeRecord(row, fields),
        ...(path === "faculty" ? { isHod: row.isHod } : {}),
      })));
    } catch (error) { next(error); }
  });
  protectedRouter.post(`/${path}`, async (req, res, next) => {
    try {
      const values = pickFields(req.body, fields);
      if (!values.name || !values.email || !values[idField]) return res.status(400).json({ message: `Name, email, and ${idField} are required.` });
      const password = req.body.password;
      if (!password || password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
      values.password = await bcrypt.hash(password, 12);
      if (path === "students" && !values.rollNumber) values.rollNumber = values.studentId;
      const row = await Model.create(values);
      res.status(201).json(safeRecord(row, fields));
    } catch (error) { next(error); }
  });
  protectedRouter.get(`/${path}/:id`, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested record ID is invalid." });
      const row = await Model.findById(req.params.id);
      if (!row) return res.status(404).json({ message: "Record not found." });
      res.json(safeRecord(row, fields));
    } catch (error) { next(error); }
  });
  protectedRouter.put(`/${path}/:id`, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested record ID is invalid." });
      const values = pickFields(req.body, fields);
      if (path === "faculty" && values.department !== undefined) {
        const current = await Faculty.findById(req.params.id).select("department isHod");
        if (current?.isHod && current.department !== values.department) values.isHod = false;
      }
      if (req.body.password) {
        if (req.body.password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
        values.password = await bcrypt.hash(req.body.password, 12);
      }
      const update = { $set: values };
      if (values.password) update.$inc = { tokenVersion: 1 };
      const row = await Model.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
      if (!row) return res.status(404).json({ message: "Record not found." });
      res.json(safeRecord(row, fields));
    } catch (error) { next(error); }
  });
  protectedRouter.delete(`/${path}/:id`, async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested record ID is invalid." });
      const row = await Model.findByIdAndDelete(req.params.id);
      if (!row) return res.status(404).json({ message: "Record not found." });
      res.json({ message: "Record deleted." });
    } catch (error) { next(error); }
  });
}

protectedRouter.get("/faculty/:id/subjects", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested faculty ID is invalid." });
    const faculty = await Faculty.findById(req.params.id).select("subjects");
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    res.json(faculty.subjects);
  } catch (error) { next(error); }
});

protectedRouter.get("/faculty-subject-assignments", async (_req, res, next) => {
  try {
    const faculty = await Faculty.find({ "subjects.0": { $exists: true } })
      .select("name facultyId department title subjects")
      .sort({ name: 1 });
    res.json(faculty.flatMap((person) => person.subjects.map((subject) => ({
      _id: subject._id,
      facultyId: person._id,
      facultyName: person.name,
      facultyCode: person.facultyId,
      department: person.department,
      designation: person.title,
      name: subject.name,
      code: subject.code,
      year: subject.year,
      section: subject.section,
      room: subject.room,
      days: subject.days,
      startTime: subject.startTime,
      endTime: subject.endTime,
    }))));
  } catch (error) { next(error); }
});

protectedRouter.post("/faculty/:id/subjects", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested faculty ID is invalid." });
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    const { assignment, error } = parseSubjectAssignment(req.body);
    if (error) return res.status(400).json({ message: error });
    if (faculty.subjects.some((subject) => subject.code.toLowerCase() === assignment.code.toLowerCase())) {
      return res.status(409).json({ message: "That subject code is already assigned to this faculty member." });
    }
    faculty.subjects.push(assignment);
    await faculty.save();
    res.status(201).json(faculty.subjects.at(-1));
  } catch (error) { next(error); }
});

protectedRouter.put("/faculty/:id/subjects/:subjectId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.subjectId)) {
      return res.status(400).json({ message: "The requested faculty or subject assignment ID is invalid." });
    }
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    const subject = faculty.subjects.id(req.params.subjectId);
    if (!subject) return res.status(404).json({ message: "Subject assignment not found." });
    const { assignment, error } = parseSubjectAssignment(req.body);
    if (error) return res.status(400).json({ message: error });
    if (faculty.subjects.some((item) => item.id !== subject.id && item.code.toLowerCase() === assignment.code.toLowerCase())) {
      return res.status(409).json({ message: "That subject code is already assigned to this faculty member." });
    }
    subject.set(assignment);
    await faculty.save();
    res.json(subject);
  } catch (error) { next(error); }
});

protectedRouter.delete("/faculty/:id/subjects/:subjectId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested faculty ID is invalid." });
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    const subject = faculty.subjects.id(req.params.subjectId);
    if (!subject) return res.status(404).json({ message: "Subject assignment not found." });
    subject.deleteOne();
    await faculty.save();
    res.json({ message: "Subject assignment removed." });
  } catch (error) { next(error); }
});

protectedRouter.post("/faculty/hod", async (req, res, next) => {
  try {
    const facultyId = typeof req.body.facultyId === "string" ? req.body.facultyId.trim() : "";
    if (!facultyId) return res.status(400).json({ message: "Enter a faculty ID." });
    const faculty = await Faculty.findOne({ facultyId });
    if (!faculty) return res.status(404).json({ message: "No faculty member was found with that faculty ID." });
    if (!faculty.department?.trim()) return res.status(400).json({ message: "Assign a department to this faculty member before designating them as HOD." });
    await Faculty.updateMany({ department: faculty.department, _id: { $ne: faculty._id }, isHod: true }, { $set: { isHod: false } });
    faculty.isHod = true;
    await faculty.save();
    res.json({ message: `${faculty.name} is now the HOD for ${faculty.department}.`, facultyId: faculty.facultyId, department: faculty.department });
  } catch (error) { next(error); }
});

protectedRouter.post("/faculty/hod/remove", async (req, res, next) => {
  try {
    const facultyId = typeof req.body.facultyId === "string" ? req.body.facultyId.trim() : "";
    if (!facultyId) return res.status(400).json({ message: "Enter a faculty ID." });
    const faculty = await Faculty.findOneAndUpdate(
      { facultyId, isHod: true },
      { $set: { isHod: false } },
      { new: true },
    ).select("name department facultyId");
    if (!faculty) return res.status(404).json({ message: "No current HOD was found with that faculty ID." });
    res.json({ message: `${faculty.name} was removed as HOD for ${faculty.department}.`, facultyId: faculty.facultyId, department: faculty.department });
  } catch (error) { next(error); }
});

protectedRouter.get("/faculty-reviews", async (_req, res, next) => {
  try {
    const reviews = await FacultyReview.find().sort({ createdAt: -1 }).lean();
    res.json(reviews.map((review) => ({
      id: review._id,
      reviewerRollNumber: review.reviewerRollNumber,
      facultyName: review.facultyName,
      facultyId: review.facultyId,
      subject: review.subject,
      subjectCode: review.subjectCode,
      department: review.department,
      year: review.year,
      section: review.section,
      semester: review.semester,
      clarity: review.clarity,
      subjectKnowledge: review.subjectKnowledge,
      engagement: review.engagement,
      support: review.support,
      comment: review.comment,
      createdAt: review.createdAt,
    })));
  } catch (error) { next(error); }
});

protectedRouter.get("/academic/:type", async (req, res, next) => {
  try {
    const type = req.params.type[0]?.toUpperCase() + req.params.type.slice(1).toLowerCase();
    if (!["Department", "Course", "Subject"].includes(type)) return res.status(404).json({ message: "Academic module not found." });
    res.json(await AcademicItem.find({ type }).sort({ name: 1 }));
  } catch (error) { next(error); }
});
protectedRouter.post("/academic/:type", async (req, res, next) => {
  try {
    const type = req.params.type[0]?.toUpperCase() + req.params.type.slice(1).toLowerCase();
    if (!["Department", "Course", "Subject"].includes(type)) return res.status(404).json({ message: "Academic module not found." });
    if (!req.body.name?.trim()) return res.status(400).json({ message: "A name is required." });
    res.status(201).json(await AcademicItem.create({ ...pickFields(req.body, ["name", "code", "department", "year"]), type }));
  } catch (error) { next(error); }
});
protectedRouter.put("/academic/:type/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested record ID is invalid." });
    const type = req.params.type[0]?.toUpperCase() + req.params.type.slice(1).toLowerCase();
    if (!["Department", "Course", "Subject"].includes(type)) return res.status(404).json({ message: "Academic module not found." });
    const row = await AcademicItem.findOneAndUpdate({ _id: req.params.id, type }, { $set: pickFields(req.body, ["name", "code", "department", "year"]) }, { new: true, runValidators: true });
    if (!row) return res.status(404).json({ message: "Record not found." });
    res.json(row);
  } catch (error) { next(error); }
});
protectedRouter.delete("/academic/:type/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested record ID is invalid." });
    const type = req.params.type[0]?.toUpperCase() + req.params.type.slice(1).toLowerCase();
    const row = await AcademicItem.findOneAndDelete({ _id: req.params.id, type });
    if (!row) return res.status(404).json({ message: "Record not found." });
    res.json({ message: "Record deleted." });
  } catch (error) { next(error); }
});

protectedRouter.get("/attendance/students", async (_req, res, next) => {
  try {
    const rows = await AttendanceRecord.find().populate("student", "name studentId rollNumber department year section").sort({ date: -1 });
    res.json(rows.filter((row) => row.student).map((row) => ({
      id: row._id,
      studentId: row.student._id,
      rollNumber: row.student.rollNumber || row.student.studentId,
      name: row.student.name,
      department: row.student.department,
      year: row.student.year,
      section: row.student.section,
      subject: row.subject,
      date: row.date,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      status: row.status === "Approved" ? "Present" : row.status,
    })));
  } catch (error) { next(error); }
});
protectedRouter.get("/attendance/faculty", async (_req, res, next) => {
  try {
    const rows = await FacultyAttendance.find().populate("faculty", "name facultyId department").sort({ date: -1 });
    res.json(rows.filter((row) => row.faculty).map((row) => ({
      id: row._id,
      facultyId: row.faculty.facultyId,
      name: row.faculty.name,
      department: row.faculty.department,
      date: row.date,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      status: row.status,
    })));
  } catch (error) { next(error); }
});
protectedRouter.get("/leaves/:type", async (req, res, next) => {
  try {
    if (!["students", "faculty"].includes(req.params.type)) return res.status(404).json({ message: "Leave module not found." });
    const Model = req.params.type === "students" ? Student : Faculty;
    const identity = req.params.type === "students" ? "studentId" : "facultyId";
    const rows = await Model.find({ "leaves.0": { $exists: true } }).select(`name ${identity} department leaves`);
    res.json(rows.flatMap((person) => person.leaves.map((leave) => ({
      id: leave._id,
      personId: person._id,
      name: person.name,
      identifier: person[identity],
      department: person.department,
      from: leave.from,
      to: leave.to,
      reason: leave.reason,
      status: leave.status,
      type: req.params.type,
    }))));
  } catch (error) { next(error); }
});
protectedRouter.patch("/leaves/:type/:personId/:leaveId", async (req, res, next) => {
  try {
    if (!["students", "faculty"].includes(req.params.type) || !["Approved", "Rejected"].includes(req.body.status)) return res.status(400).json({ message: "Choose a valid leave decision." });
    if (!mongoose.isValidObjectId(req.params.personId)) return res.status(400).json({ message: "The requested record ID is invalid." });
    const Model = req.params.type === "students" ? Student : Faculty;
    const person = await Model.findById(req.params.personId);
    const leave = person?.leaves.id(req.params.leaveId);
    if (!leave) return res.status(404).json({ message: "Leave request not found." });
    leave.status = req.body.status;
    await person.save();
    res.json({ message: `Leave request ${req.body.status.toLowerCase()}.`, status: leave.status });
  } catch (error) { next(error); }
});
protectedRouter.get("/reports", async (_req, res, next) => {
  try {
    const [students, faculty, courses, departments, facultyAttendance] = await Promise.all([
      Student.countDocuments(), Faculty.countDocuments(), AcademicItem.countDocuments({ type: "Course" }),
      AcademicItem.countDocuments({ type: "Department" }), FacultyAttendance.countDocuments(),
    ]);
    res.json({ generatedAt: new Date(), totals: { students, faculty, courses, departments, facultyAttendance } });
  } catch (error) { next(error); }
});

protectedRouter.get("/settings", async (_req, res, next) => {
  try {
    const settings = await AdminSetting.findOne({ key: "portal" });
    if (settings?.collegeName === "Northwood College") {
      settings.collegeName = "Hanikat's College of Engineering & Technology (HCET)";
      await settings.save();
    }
    res.json(settings || { collegeName: "Hanikat's College of Engineering & Technology (HCET)", email: "", phone: "", address: "", passwordPolicy: "Strong" });
  } catch (error) { next(error); }
});
protectedRouter.put("/settings", async (req, res, next) => {
  try {
    const values = pickFields(req.body, ["collegeName", "email", "phone", "address", "passwordPolicy"]);
    if (values.passwordPolicy && !["Basic", "Strong", "Very strong"].includes(values.passwordPolicy)) return res.status(400).json({ message: "Choose a valid password policy." });
    const settings = await AdminSetting.findOneAndUpdate({ key: "portal" }, { $set: values }, { new: true, upsert: true, runValidators: true });
    res.json(settings);
  } catch (error) { next(error); }
});

protectedRouter.get("/admins", async (_req, res, next) => {
  try {
    const admins = await Admin.find().sort({ createdAt: 1 }).select("name email role");
    res.json(admins.map((admin) => ({ id: admin._id, name: admin.name, email: admin.email, role: admin.role })));
  } catch (error) { next(error); }
});
protectedRouter.post("/admins", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: "Name, email, and password are required." });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    const admin = await Admin.create({ name: name.trim(), email: email.trim().toLowerCase(), password: await bcrypt.hash(password, 12) });
    res.status(201).json({ id: admin._id, name: admin.name, email: admin.email, role: admin.role });
  } catch (error) { next(error); }
});
protectedRouter.put("/admins/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested record ID is invalid." });
    const values = pickFields(req.body, ["name", "email"]);
    if (req.body.password) {
      if (req.body.password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
      values.password = await bcrypt.hash(req.body.password, 12);
    }
    const update = { $set: values };
    if (values.password) update.$inc = { tokenVersion: 1 };
    const admin = await Admin.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!admin) return res.status(404).json({ message: "Admin account not found." });
    res.json({ id: admin._id, name: admin.name, email: admin.email, role: admin.role });
  } catch (error) { next(error); }
});
protectedRouter.delete("/admins/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested record ID is invalid." });
    if (req.params.id === String(req.userId)) return res.status(400).json({ message: "You cannot delete your own administrator account." });
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin account not found." });
    res.json({ message: "Admin account deleted." });
  } catch (error) { next(error); }
});

protectedRouter.post("/attendance/faculty", async (req, res, next) => {
  try {
    const { facultyId, date, checkIn = "", checkOut = "", status = "Present" } = req.body;
    if (!mongoose.isValidObjectId(facultyId)) return res.status(400).json({ message: "Choose a valid faculty record." });
    const parsedDate = new Date(date);
    if (!date || Number.isNaN(parsedDate.valueOf())) return res.status(400).json({ message: "Choose a valid attendance date." });
    if (!["Present", "Absent", "Late"].includes(status)) return res.status(400).json({ message: "Choose a valid attendance status." });
    const faculty = await Faculty.findById(facultyId);
    if (!faculty) return res.status(404).json({ message: "Faculty record not found." });
    const bounds = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));
    const record = await FacultyAttendance.findOneAndUpdate(
      { faculty: facultyId, date: bounds },
      { $set: { checkIn, checkOut, status } },
      { new: true, upsert: true, runValidators: true },
    );
    res.status(201).json(record);
  } catch (error) { next(error); }
});
protectedRouter.put("/attendance/faculty/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested record ID is invalid." });
    const values = pickFields(req.body, ["checkIn", "checkOut", "status"]);
    if (values.status && !["Present", "Absent", "Late"].includes(values.status)) return res.status(400).json({ message: "Choose a valid attendance status." });
    const record = await FacultyAttendance.findByIdAndUpdate(req.params.id, { $set: values }, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ message: "Attendance record not found." });
    res.json(record);
  } catch (error) { next(error); }
});
protectedRouter.delete("/attendance/faculty/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested record ID is invalid." });
    const record = await FacultyAttendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: "Attendance record not found." });
    res.json({ message: "Attendance record deleted." });
  } catch (error) { next(error); }
});

protectedRouter.put("/attendance/students/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested record ID is invalid." });
    const values = pickFields(req.body, ["checkIn", "checkOut", "status", "subject", "date"]);
    if (values.status && !["Pending", "Present", "Absent", "Approved", "Rejected"].includes(values.status)) return res.status(400).json({ message: "Choose a valid attendance status." });
    const record = await AttendanceRecord.findByIdAndUpdate(req.params.id, { $set: values }, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ message: "Student attendance record not found." });
    res.json(record);
  } catch (error) { next(error); }
});
protectedRouter.post("/attendance/students", async (req, res, next) => {
  try {
    const { studentId, facultyId, subject, date, checkIn = "", checkOut = "", status = "Present" } = req.body;
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ message: "Choose a valid student record." });
    if (!mongoose.isValidObjectId(facultyId)) return res.status(400).json({ message: "Choose a valid faculty record." });
    if (!subject?.trim()) return res.status(400).json({ message: "A subject is required." });
    const parsedDate = new Date(date);
    if (!date || Number.isNaN(parsedDate.valueOf())) return res.status(400).json({ message: "Choose a valid attendance date." });
    if (!["Pending", "Present", "Absent", "Approved", "Rejected"].includes(status)) return res.status(400).json({ message: "Choose a valid attendance status." });
    const [student, faculty] = await Promise.all([Student.findById(studentId), Faculty.findById(facultyId)]);
    if (!student || !faculty) return res.status(404).json({ message: "Student or faculty record not found." });
    const record = await AttendanceRecord.create({ student: studentId, faculty: facultyId, subject: subject.trim(), date: parsedDate, checkIn, checkOut, status });
    res.status(201).json(record);
  } catch (error) { next(error); }
});
protectedRouter.delete("/attendance/students/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "The requested record ID is invalid." });
    const record = await AttendanceRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: "Student attendance record not found." });
    res.json({ message: "Student attendance record deleted." });
  } catch (error) { next(error); }
});

router.use(protectedRouter);
export default router;
