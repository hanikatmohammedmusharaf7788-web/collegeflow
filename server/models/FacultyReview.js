import mongoose from "mongoose";

const facultyReviewSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  reviewerRollNumber: { type: String, required: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  facultyName: { type: String, required: true },
  facultyId: { type: String, required: true },
  subject: { type: String, required: true },
  subjectCode: { type: String, default: "" },
  department: { type: String, required: true },
  year: { type: String, required: true },
  section: { type: String, required: true },
  semester: { type: String, required: true },
  clarity: { type: Number, required: true, min: 1, max: 5 },
  subjectKnowledge: { type: Number, required: true, min: 1, max: 5 },
  engagement: { type: Number, required: true, min: 1, max: 5 },
  support: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "", maxlength: 1000, trim: true },
}, { timestamps: true });

facultyReviewSchema.index({ student: 1, faculty: 1, subject: 1, semester: 1 }, { unique: true });

export default mongoose.model("FacultyReview", facultyReviewSchema);
