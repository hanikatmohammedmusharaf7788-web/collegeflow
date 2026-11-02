import { Router } from "express";
import mongoose from "mongoose";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import SupportRequest from "../models/SupportRequest.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const issueTypes = {
  student: ["Sign-in or password", "Attendance or check-in", "Marks or grades", "Courses or timetable", "Leave request", "Technical issue", "Other"],
  faculty: ["Sign-in or password", "Student attendance", "Student records", "Subjects or classes", "Marks or grades", "Technical issue", "Other"],
};
const destinations = ["admin", "class-teacher", "hod", "higher-management"];
const requestStatuses = ["Open", "In progress", "Resolved"];

router.use(requireAuth);

router.get("/contact", async (req, res, next) => {
  try {
    if (!issueTypes[req.role]) return res.status(403).json({ message: "Support is available to students and faculty." });
    const contacts = { email: process.env.SUPPORT_EMAIL?.trim() || "", classTeachers: [] };
    if (req.role === "student") {
      const student = await Student.findById(req.userId).select("department year section attendance timetable");
      if (!student) return res.status(404).json({ message: "Your account could not be found." });
      const subjectNames = [...new Set([
        ...student.attendance.map((item) => item.subject),
        ...student.timetable.map((item) => item.subject),
      ].filter(Boolean))];
      if (subjectNames.length) {
        const faculty = await Faculty.find({
          department: student.department,
          subjects: { $elemMatch: { name: { $in: subjectNames }, year: student.year, section: student.section } },
        }).select("name subjects");
        contacts.classTeachers = faculty.map((person) => ({
          id: person._id,
          name: person.name,
          subjects: person.subjects
            .filter((subject) => subjectNames.includes(subject.name) && subject.year === student.year && subject.section === student.section)
            .map((subject) => subject.name),
        }));
      }
    }
    res.json(contacts);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { issueType, description, destination, facultyId, subject } = req.body;
    if (!issueTypes[req.role]) return res.status(403).json({ message: "Support is available to students and faculty." });
    if (!issueTypes[req.role].includes(issueType)) return res.status(400).json({ message: "Choose a valid support topic." });
    if (!destinations.includes(destination)) return res.status(400).json({ message: "Choose where to send your support request." });
    if (typeof description !== "string" || description.trim().length < 10 || description.trim().length > 3000) {
      return res.status(400).json({ message: "Describe the issue in 10 to 3,000 characters." });
    }
    if (["class-teacher", "hod"].includes(destination) && req.role !== "student") {
      return res.status(403).json({ message: "Only students can direct requests to class staff." });
    }

    const Account = req.role === "student" ? Student : Faculty;
    const account = await Account.findById(req.userId).select("name email studentId facultyId department year section attendance timetable");
    if (!account) return res.status(404).json({ message: "Your account could not be found." });

    let recipientPortal = "admin";
    let recipientFaculty = null;
    let recipientDepartment = "";
    let resolvedSubject = "";

    if (destination === "class-teacher") {
      if (!mongoose.isValidObjectId(facultyId) || typeof subject !== "string" || !subject.trim()) {
        return res.status(400).json({ message: "Choose a subject and its assigned class teacher." });
      }
      const student = account;
      if (![...student.attendance, ...student.timetable].some((item) => item.subject === subject.trim())) {
        return res.status(400).json({ message: "Choose one of your enrolled subjects." });
      }
      const teacher = await Faculty.findOne({
        _id: facultyId,
        department: student.department,
        subjects: { $elemMatch: { name: subject.trim(), year: student.year, section: student.section } },
      }).select("_id");
      if (!teacher) return res.status(400).json({ message: "The selected faculty member is not assigned to your class and subject." });
      recipientPortal = "faculty";
      recipientFaculty = teacher._id;
      resolvedSubject = subject.trim();
    } else if (destination === "hod") {
      const hod = await Faculty.findOne({ department: account.department, isHod: true }).select("_id");
      if (!hod) return res.status(400).json({ message: `No HOD has been assigned for ${account.department}. Contact the administrator.` });
      recipientPortal = "faculty";
      recipientFaculty = hod._id;
    }

    const request = await SupportRequest.create({
      requesterId: String(account._id),
      requesterName: account.name,
      requesterEmail: account.email,
      requesterRole: req.role,
      requesterIdentifier: req.role === "student" ? account.studentId : account.facultyId,
      destination,
      recipientPortal,
      recipientFaculty,
      recipientDepartment,
      subject: resolvedSubject,
      issueType,
      description: description.trim(),
    });
    res.status(201).json({ message: "Your support request was sent to the selected portal.", requestId: request._id });
  } catch (error) { next(error); }
});

router.get("/mine", async (req, res, next) => {
  try {
    if (!issueTypes[req.role]) return res.status(403).json({ message: "Support is available to students and faculty." });
    const requests = await SupportRequest.find({ requesterId: String(req.userId) }).sort({ createdAt: -1 }).limit(100).lean();
    res.json(requests);
  } catch (error) { next(error); }
});

router.get("/inbox", async (req, res, next) => {
  try {
    let filter = {};
    if (req.role === "faculty") {
      if (!(await Faculty.exists({ _id: req.userId }))) return res.status(404).json({ message: "Faculty account not found." });
      filter = { recipientPortal: "faculty", recipientFaculty: req.userId };
    } else if (req.role !== "admin") {
      return res.status(403).json({ message: "You do not have permission to view support requests." });
    }
    const requests = await SupportRequest.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json(requests);
  } catch (error) { next(error); }
});

router.patch("/:requestId/status", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.requestId)) return res.status(400).json({ message: "The support request ID is invalid." });
    if (!requestStatuses.includes(req.body.status)) return res.status(400).json({ message: "Choose a valid request status." });
    const request = await SupportRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Support request not found." });
    if (req.role === "faculty") {
      const isAssigned = request.recipientPortal === "faculty"
        && String(request.recipientFaculty) === String(req.userId);
      if (!isAssigned) return res.status(403).json({ message: "This support request is not assigned to you." });
    } else if (req.role !== "admin") {
      return res.status(403).json({ message: "You do not have permission to update support requests." });
    }
    request.status = req.body.status;
    await request.save();
    res.json({ id: request._id, status: request.status });
  } catch (error) { next(error); }
});

export default router;
