import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import AttendanceCheckinCode from "../models/AttendanceCheckinCode.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
const isValidAttendanceTime = (value) => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
router.use(requireAuth, requireRole("faculty"));

function dayBounds(value) {
  const input = value ? new Date(`${value}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(input.valueOf())) return null;
  const start = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  return { start, end: new Date(start.valueOf() + 86400000) };
}

async function getFaculty(req) {
  return Faculty.findById(req.userId);
}

function studentFilter(faculty, query = {}) {
  const filter = { department: faculty.department };
  if (typeof query.year === "string" && query.year) filter.year = query.year;
  if (typeof query.section === "string" && query.section) filter.section = query.section;
  if (typeof query.search === "string" && query.search.trim()) {
    const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { studentId: { $regex: escaped, $options: "i" } },
      { rollNumber: { $regex: escaped, $options: "i" } },
    ];
  }
  return filter;
}

function safeStudent(student) {
  return {
    id: student._id,
    name: student.name,
    studentId: student.studentId,
    rollNumber: student.rollNumber || student.studentId,
    department: student.department,
    year: student.year,
    section: student.section,
    email: student.email,
    photo: student.photo,
  };
}

router.get("/dashboard", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    const today = dayBounds();
    const students = await Student.find(studentFilter(faculty)).select("name studentId rollNumber department year section marks updatedAt");
    const [pendingAttendance, recentAttendance, leaveStudents] = await Promise.all([
      AttendanceRecord.countDocuments({ faculty: faculty._id, date: { $gte: today.start, $lt: today.end }, status: "Pending" }),
      AttendanceRecord.find({ faculty: faculty._id }).sort({ updatedAt: -1 }).limit(5).populate("student", "name studentId rollNumber"),
      Student.find({ department: faculty.department, "leaves.status": "Pending" }).select("name studentId rollNumber leaves"),
    ]);
    const pendingLeaves = leaveStudents.reduce((count, student) => count + student.leaves.filter((leave) => leave.status === "Pending").length, 0);
    const activities = recentAttendance.filter((item) => item.student).map((item) => ({
      id: item._id,
      name: item.student.name,
      rollNumber: item.student.rollNumber || item.student.studentId,
      action: `${item.status.toLowerCase()} for ${item.subject}`,
      time: item.updatedAt,
      status: item.status,
    }));
    res.json({
      profile: { id: faculty._id, name: faculty.name, email: faculty.email, facultyId: faculty.facultyId, photo: faculty.photo, department: faculty.department, title: faculty.title, mobile: faculty.mobile, role: "faculty" },
      stats: { students: students.length, subjects: faculty.subjects.length, pendingAttendance, pendingLeaves },
      schedule: faculty.subjects.filter((subject) => subject.days.includes(new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(new Date()))),
      activities,
      announcements: faculty.announcements.slice(-4).reverse(),
      notifications: faculty.notifications.slice(-5).reverse(),
    });
  } catch (error) { next(error); }
});

router.get("/profile", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    res.json(publicProfile(faculty));
  } catch (error) { next(error); }
});

router.put("/profile", async (req, res, next) => {
  try {
    const fields = ["name", "photo", "title", "mobile"];
    const updates = Object.fromEntries(fields.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]));
    const faculty = await Faculty.findByIdAndUpdate(req.userId, { $set: updates }, { new: true, runValidators: true });
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    res.json(publicProfile(faculty));
  } catch (error) { next(error); }
});

router.get("/students", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    const students = await Student.find(studentFilter(faculty, req.query)).sort({ rollNumber: 1, name: 1 });
    res.json(students.map(safeStudent));
  } catch (error) { next(error); }
});

router.get("/attendance", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    const bounds = dayBounds(req.query.date);
    if (!bounds) return res.status(400).json({ message: "Choose a valid attendance date." });
    const assignedSubject = typeof req.query.subject === "string"
      ? faculty.subjects.find((item) => item.name === req.query.subject)
      : null;
    if (!assignedSubject) return res.status(403).json({ message: "Choose one of your assigned subjects." });
    if ((req.query.year && req.query.year !== assignedSubject.year)
      || (req.query.section && req.query.section !== assignedSubject.section)) {
      return res.status(403).json({ message: "Attendance filters must match the assigned subject's class." });
    }
    const filters = studentFilter(faculty, { year: assignedSubject.year, section: assignedSubject.section });
    const [students, records] = await Promise.all([
      Student.find(filters).sort({ rollNumber: 1, name: 1 }),
      AttendanceRecord.find({ faculty: faculty._id, subject: assignedSubject.name, date: { $gte: bounds.start, $lt: bounds.end } }),
    ]);
    const byStudent = new Map(records.map((record) => [record.student.toString(), record]));
    res.json(students.map((student) => {
      const record = byStudent.get(student._id.toString());
      return {
        id: record?._id,
        studentId: student._id,
        rollNumber: student.rollNumber || student.studentId,
        name: student.name,
        department: student.department,
        year: student.year,
        section: student.section,
        subject: assignedSubject.name,
        date: bounds.start,
        checkIn: record?.checkIn || "",
        checkOut: record?.checkOut || "",
        status: record?.status || "Pending",
      };
    }));
  } catch (error) { next(error); }
});

router.post("/attendance/check-in-code", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    const subjectName = typeof req.body.subject === "string" ? req.body.subject.trim() : "";
    const subject = faculty.subjects.find((item) => item.name === subjectName);
    if (!subject) return res.status(403).json({ message: "That subject is not assigned to your account." });
    const code = randomBytes(6).toString("base64url").slice(0, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await AttendanceCheckinCode.create({
      faculty: faculty._id,
      subject: subject.name,
      department: faculty.department,
      year: subject.year,
      section: subject.section,
      codeHash: createHash("sha256").update(code).digest("hex"),
      expiresAt,
    });
    res.status(201).json({ code, subject: subject.name, expiresAt });
  } catch (error) { next(error); }
});

router.post("/attendance/save", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    const { records, subject, date } = req.body;
    const bounds = dayBounds(date);
    if (!bounds) return res.status(400).json({ message: "Choose a valid attendance date." });
    const assignedSubject = faculty.subjects.find((item) => item.name === subject);
    if (!assignedSubject) return res.status(403).json({ message: "That subject is not assigned to your account." });
    if (!Array.isArray(records) || records.length === 0) return res.status(400).json({ message: "There are no attendance records to save." });
    const studentIds = records.map((item) => item.studentId);
    if (studentIds.some((id) => !mongoose.isValidObjectId(id))) return res.status(400).json({ message: "One or more student IDs are invalid." });
    const allowedStatuses = ["Pending", "Present", "Absent", "Approved", "Rejected"];
    if (records.some((item) => item.status && !allowedStatuses.includes(item.status))) return res.status(400).json({ message: "One or more attendance statuses are invalid." });
    if (records.some((item) => item.status === "Approved"
      && (!isValidAttendanceTime(item.checkIn) || !isValidAttendanceTime(item.checkOut)))) {
      return res.status(400).json({ message: "Enter valid check-in and check-out times before approving attendance." });
    }
    if (new Set(studentIds).size !== studentIds.length) return res.status(400).json({ message: "Attendance contains a duplicate student." });
    const students = await Student.find({
      _id: { $in: studentIds },
      department: faculty.department,
      year: assignedSubject.year,
      section: assignedSubject.section,
    }).select("_id");
    if (students.length !== new Set(studentIds).size) return res.status(403).json({ message: "Attendance can only be saved for students in your department." });
    const operations = records.map((item) => ({
      updateOne: {
        filter: { faculty: faculty._id, student: item.studentId, subject, date: bounds.start },
        update: { $set: { checkIn: item.checkIn || "", checkOut: item.checkOut || "", status: item.status || "Pending" } },
        upsert: true,
      },
    }));
    await AttendanceRecord.bulkWrite(operations);
    res.json({ message: "Attendance saved.", saved: operations.length });
  } catch (error) { next(error); }
});

router.put("/attendance/:recordId/review", async (req, res, next) => {
  try {
    if (!["Approved", "Rejected"].includes(req.body.status)) return res.status(400).json({ message: "Status must be Approved or Rejected." });
    if (req.body.status === "Approved"
      && (!isValidAttendanceTime(req.body.checkIn) || !isValidAttendanceTime(req.body.checkOut))) {
      return res.status(400).json({ message: "Enter valid check-in and check-out times before approving attendance." });
    }
    const updates = { status: req.body.status };
    if (req.body.status === "Approved") {
      updates.checkIn = req.body.checkIn;
      updates.checkOut = req.body.checkOut;
    }
    const record = await AttendanceRecord.findOneAndUpdate(
      { _id: req.params.recordId, faculty: req.userId },
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!record) return res.status(404).json({ message: "Attendance record not found." });
    res.json(record);
  } catch (error) { next(error); }
});

router.get("/marks", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    const students = await Student.find(studentFilter(faculty, req.query)).sort({ rollNumber: 1, name: 1 });
    const marks = students.flatMap((student) => student.marks.map((mark) => ({
      id: mark._id,
      studentId: student._id,
      rollNumber: student.rollNumber || student.studentId,
      studentName: student.name,
      year: student.year,
      section: student.section,
      subject: mark.subject,
      internal: mark.internal,
      external: mark.external,
      total: mark.internal + mark.external,
      grade: mark.grade,
      gpa: mark.gpa,
    }))).filter((mark) => faculty.subjects.some((subject) => subject.name === mark.subject
      && subject.year === mark.year && subject.section === mark.section)
      && (!req.query.subject || mark.subject === req.query.subject));
    res.json(marks);
  } catch (error) { next(error); }
});

router.post("/marks", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    const { studentId, subject, internal, external } = req.body;
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ message: "Student ID is invalid." });
    if (!subject?.trim() || !Number.isFinite(Number(internal)) || !Number.isFinite(Number(external)) || internal < 0 || internal > 40 || external < 0 || external > 60) {
      return res.status(400).json({ message: "Enter a subject, internal marks (0–40), and external marks (0–60)." });
    }
    const assignedSubject = faculty.subjects.find((item) => item.name === subject.trim());
    if (!assignedSubject) return res.status(403).json({ message: "That subject is not assigned to your account." });
    const student = await Student.findOne({ _id: studentId, department: faculty.department });
    if (!student) return res.status(404).json({ message: "Student not found in your department." });
    if (student.year !== assignedSubject.year || student.section !== assignedSubject.section) {
      return res.status(403).json({ message: "You can only enter marks for students in the assigned class." });
    }
    const values = { internal: Number(internal), external: Number(external), grade: gradeFor(Number(internal) + Number(external)), gpa: gpaFor(Number(internal) + Number(external)) };
    let mark = student.marks.find((item) => item.subject === subject.trim());
    const isNew = !mark;
    if (mark) Object.assign(mark, values);
    else { student.marks.push({ subject: subject.trim(), ...values }); mark = student.marks.at(-1); }
    await student.save();
    res.status(isNew ? 201 : 200).json({ id: mark._id, studentId: student._id, studentName: student.name, rollNumber: student.rollNumber || student.studentId, subject: mark.subject, ...values, total: values.internal + values.external });
  } catch (error) { next(error); }
});

router.put("/marks/:studentId/:markId", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    const { internal, external } = req.body;
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    if (!Number.isFinite(Number(internal)) || !Number.isFinite(Number(external)) || internal < 0 || internal > 40 || external < 0 || external > 60) {
      return res.status(400).json({ message: "Internal marks must be 0–40 and external marks 0–60." });
    }
    const student = await Student.findOne({ _id: req.params.studentId, department: faculty.department });
    if (!student) return res.status(404).json({ message: "Student not found in your department." });
    const mark = student.marks.id(req.params.markId);
    if (!mark) return res.status(404).json({ message: "Marks record not found." });
    const assignedSubject = faculty.subjects.find((item) => item.name === mark.subject);
    if (!assignedSubject || student.year !== assignedSubject.year || student.section !== assignedSubject.section) {
      return res.status(403).json({ message: "Those marks are not for one of your assigned classes." });
    }
    mark.internal = Number(internal); mark.external = Number(external);
    mark.grade = gradeFor(mark.internal + mark.external); mark.gpa = gpaFor(mark.internal + mark.external);
    await student.save();
    res.json({ message: "Marks updated.", mark });
  } catch (error) { next(error); }
});

router.delete("/marks/:studentId/:markId", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    const student = await Student.findOne({ _id: req.params.studentId, department: faculty.department });
    if (!student) return res.status(404).json({ message: "Student not found in your department." });
    const mark = student.marks.id(req.params.markId);
    if (!mark) return res.status(404).json({ message: "Marks record not found." });
    const assignedSubject = faculty.subjects.find((item) => item.name === mark.subject);
    if (!assignedSubject || student.year !== assignedSubject.year || student.section !== assignedSubject.section) {
      return res.status(403).json({ message: "Those marks are not for one of your assigned classes." });
    }
    mark.deleteOne();
    await student.save();
    res.json({ message: "Marks record deleted." });
  } catch (error) { next(error); }
});

router.get("/leaves", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    const students = await Student.find({ ...studentFilter(faculty, req.query), "leaves.0": { $exists: true } }).sort({ name: 1 });
    const leaves = students.flatMap((student) => student.leaves.filter((leave) => !req.query.status || leave.status === req.query.status).map((leave) => ({
      id: leave._id, studentId: student._id, studentName: student.name, rollNumber: student.rollNumber || student.studentId,
      department: student.department, from: leave.from, to: leave.to, reason: leave.reason, status: leave.status,
      appliedAt: leave.appliedAt, attachment: leave.attachment,
    })));
    res.json(leaves.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt)));
  } catch (error) { next(error); }
});

router.put("/leaves/:studentId/:leaveId", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    if (!["Approved", "Rejected"].includes(req.body.status)) return res.status(400).json({ message: "Status must be Approved or Rejected." });
    const student = await Student.findOne({ _id: req.params.studentId, department: faculty.department });
    if (!student) return res.status(404).json({ message: "Student not found in your department." });
    const leave = student.leaves.id(req.params.leaveId);
    if (!leave) return res.status(404).json({ message: "Leave request not found." });
    leave.status = req.body.status;
    await student.save();
    res.json({ message: `Leave request ${req.body.status.toLowerCase()}.`, status: leave.status });
  } catch (error) { next(error); }
});

router.get("/subjects", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    res.json(faculty.subjects);
  } catch (error) { next(error); }
});

router.put("/notifications/:notificationId/read", async (req, res, next) => {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ message: "Faculty account not found." });
    const notification = faculty.notifications.id(req.params.notificationId);
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    notification.read = true;
    await faculty.save();
    res.json({ message: "Notification marked as read." });
  } catch (error) { next(error); }
});

function publicProfile(faculty) {
  return { id: faculty._id, name: faculty.name, email: faculty.email, facultyId: faculty.facultyId, photo: faculty.photo, department: faculty.department, title: faculty.title, mobile: faculty.mobile, isHod: faculty.isHod, role: "faculty" };
}

function gradeFor(total) {
  if (total >= 90) return "O";
  if (total >= 80) return "A+";
  if (total >= 70) return "A";
  if (total >= 60) return "B+";
  if (total >= 50) return "B";
  if (total >= 40) return "C";
  return "F";
}

function gpaFor(total) {
  return Math.max(0, Math.min(10, Number((total / 10).toFixed(1))));
}

export default router;
