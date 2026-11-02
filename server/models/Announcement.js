import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
  sender: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderRole: { type: String, enum: ["admin", "faculty"], required: true },
  senderName: { type: String, required: true },
  audience: { type: String, enum: ["everyone", "class", "hod"], required: true },
  department: { type: String, default: "" },
  year: { type: String, default: "" },
  section: { type: String, default: "" },
  subject: { type: String, default: "" },
  subjectCode: { type: String, default: "" },
  targetFaculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", default: null },
}, { timestamps: true });

announcementSchema.index({ audience: 1, department: 1, year: 1, section: 1, targetFaculty: 1, createdAt: -1 });

export default mongoose.model("Announcement", announcementSchema);
