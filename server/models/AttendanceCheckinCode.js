import mongoose from "mongoose";

const attendanceCheckinCodeSchema = new mongoose.Schema({
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  subject: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  year: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true },
  codeHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

export default mongoose.model("AttendanceCheckinCode", attendanceCheckinCodeSchema);
