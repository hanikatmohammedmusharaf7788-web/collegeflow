import { Router } from "express";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import Announcement from "../models/Announcement.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    let filter;
    if (req.role === "student") {
      const student = await Student.findById(req.userId).select("department year section");
      if (!student) return res.status(404).json({ message: "Student account not found." });
      filter = {
        $or: [
          { audience: "everyone" },
          { audience: "class", department: student.department, year: student.year, section: student.section },
        ],
      };
    } else if (req.role === "faculty") {
      if (!(await Faculty.exists({ _id: req.userId }))) return res.status(404).json({ message: "Faculty account not found." });
      filter = {
        $or: [
          { audience: "everyone" },
          { audience: "hod", targetFaculty: req.userId },
        ],
      };
    } else if (req.role === "admin") {
      if (!(await Admin.exists({ _id: req.userId }))) return res.status(404).json({ message: "Admin account not found." });
      filter = {};
    } else {
      return res.status(403).json({ message: "You do not have permission to view announcements." });
    }
    const announcements = await Announcement.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json(announcements.map((item) => ({
      _id: item._id,
      title: item.title,
      message: item.message,
      senderRole: item.senderRole,
      senderName: item.senderName,
      audience: item.audience,
      department: item.department,
      year: item.year,
      section: item.section,
      subject: item.subject,
      subjectCode: item.subjectCode,
      createdAt: item.createdAt,
    })));
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, message, audience, subjectId } = req.body || {};
    if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
      return res.status(400).json({ message: "Enter an announcement title of up to 120 characters." });
    }
    if (typeof message !== "string" || !message.trim() || message.trim().length > 3000) {
      return res.status(400).json({ message: "Enter an announcement message of up to 3,000 characters." });
    }

    let sender;
    let senderRole = req.role;
    let target = { audience: "everyone" };
    if (req.role === "admin") {
      sender = await Admin.findById(req.userId).select("name");
      if (!sender) return res.status(404).json({ message: "Admin account not found." });
    } else if (req.role === "faculty") {
      sender = await Faculty.findById(req.userId).select("name department subjects");
      if (!sender) return res.status(404).json({ message: "Faculty account not found." });
      if (audience === "class") {
        if (typeof subjectId !== "string" || !mongoose.isValidObjectId(subjectId)) {
          return res.status(400).json({ message: "Choose one of your assigned class subjects." });
        }
        const subject = sender.subjects.id(subjectId);
        if (!subject) return res.status(403).json({ message: "You can only announce to your assigned classes." });
        target = {
          audience: "class",
          department: sender.department,
          year: subject.year,
          section: subject.section,
          subject: subject.name,
          subjectCode: subject.code,
        };
      } else if (audience === "hod") {
        const hod = await Faculty.findOne({ department: sender.department, isHod: true }).select("_id");
        if (!hod) return res.status(400).json({ message: `No HOD is assigned for ${sender.department}.` });
        target = { audience: "hod", department: sender.department, targetFaculty: hod._id };
      } else {
        return res.status(400).json({ message: "Faculty can send announcements to an assigned class or the department HOD." });
      }
    } else {
      return res.status(403).json({ message: "Only Admin and Faculty can send announcements." });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      sender: sender._id,
      senderRole,
      senderName: sender.name,
      ...target,
    });
    res.status(201).json({ message: "Announcement sent.", announcement });
  } catch (error) { next(error); }
});

export default router;
