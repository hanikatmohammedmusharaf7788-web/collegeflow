import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  code: { type: String, default: "" },
  present: { type: Number, default: 0, min: 0 },
  absent: { type: Number, default: 0, min: 0 },
  color: { type: String, default: "#5278f5" },
});

const markSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  internal: { type: Number, default: 0, min: 0, max: 40 },
  external: { type: Number, default: 0, min: 0, max: 60 },
  grade: { type: String, default: "—" },
  gpa: { type: Number, default: 0, min: 0, max: 10 },
});

const timetableSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  day: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  room: { type: String, default: "" },
  instructor: { type: String, default: "" },
});

const leaveSchema = new mongoose.Schema({
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  reason: { type: String, required: true },
  attachment: { type: String, default: "" },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  appliedAt: { type: Date, default: Date.now },
});

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: "info" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0, min: 0 },
    mustChangePassword: { type: Boolean, default: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordResetOtpHash: { type: String, select: false },
    passwordResetOtpExpiresAt: { type: Date, select: false },
    studentId: { type: String, required: true, unique: true, trim: true },
    rollNumber: { type: String, trim: true, default: "" },
    photo: { type: String, default: "" },
    department: { type: String, default: "Computer Science" },
    year: { type: String, default: "3rd Year" },
    section: { type: String, default: "A" },
    semester: { type: String, default: "Semester 5" },
    mobile: { type: String, default: "" },
    attendance: { type: [attendanceSchema], default: [] },
    marks: { type: [markSchema], default: [] },
    timetable: { type: [timetableSchema], default: [] },
    leaves: { type: [leaveSchema], default: [] },
    notifications: { type: [notificationSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("Student", studentSchema);
