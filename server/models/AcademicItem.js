import mongoose from "mongoose";

const academicItemSchema = new mongoose.Schema({
  type: { type: String, enum: ["Department", "Course", "Subject"], required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, default: "" },
  department: { type: String, trim: true, default: "" },
  year: { type: String, trim: true, default: "" },
}, { timestamps: true });

academicItemSchema.index({ type: 1, name: 1 }, { unique: true });

export default mongoose.model("AcademicItem", academicItemSchema);
