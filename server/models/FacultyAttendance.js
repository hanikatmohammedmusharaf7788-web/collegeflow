import mongoose from "mongoose";

const facultyAttendanceSchema = new mongoose.Schema({
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
  date: { type: Date, required: true },
  checkIn: { type: String, default: "" },
  checkOut: { type: String, default: "" },
  status: { type: String, enum: ["Present", "Absent", "Late"], default: "Present" },
}, { timestamps: true });

facultyAttendanceSchema.index({ faculty: 1, date: 1 }, { unique: true });

export default mongoose.model("FacultyAttendance", facultyAttendanceSchema);
