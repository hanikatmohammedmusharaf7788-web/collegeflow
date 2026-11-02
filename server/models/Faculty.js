import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
  year: { type: String, default: "3rd Year" },
  section: { type: String, default: "A" },
  room: { type: String, default: "Room 204" },
  days: { type: [String], default: ["Monday", "Wednesday"] },
  startTime: { type: String, default: "09:00" },
  endTime: { type: String, default: "10:00" },
});

const leaveSchema = new mongoose.Schema({
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  appliedAt: { type: Date, default: Date.now },
});

const facultySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  tokenVersion: { type: Number, default: 0, min: 0 },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  passwordResetOtpHash: { type: String, select: false },
  passwordResetOtpExpiresAt: { type: Date, select: false },
  facultyId: { type: String, required: true, unique: true, trim: true },
  photo: { type: String, default: "" },
  department: { type: String, default: "Computer Science" },
  title: { type: String, default: "Faculty" },
  isHod: { type: Boolean, default: false },
  mobile: { type: String, default: "" },
  subjects: { type: [subjectSchema], default: [] },
  leaves: { type: [leaveSchema], default: [] },
  announcements: { type: [{ title: String, message: String, createdAt: { type: Date, default: Date.now } }], default: [] },
  notifications: { type: [{ title: String, message: String, read: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now } }], default: [] },
}, { timestamps: true });

export default mongoose.model("Faculty", facultySchema);
