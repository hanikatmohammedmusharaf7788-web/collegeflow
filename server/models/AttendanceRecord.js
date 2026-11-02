import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema({
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  subject: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  checkIn: { type: String, default: "" },
  checkOut: { type: String, default: "" },
  status: { type: String, enum: ["Pending", "Present", "Absent", "Approved", "Rejected"], default: "Pending" },
}, { timestamps: true });

attendanceRecordSchema.index({ faculty: 1, student: 1, subject: 1, date: 1 }, { unique: true });

export default mongoose.model("AttendanceRecord", attendanceRecordSchema);
