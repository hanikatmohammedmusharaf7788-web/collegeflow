import mongoose from "mongoose";

const supportRequestSchema = new mongoose.Schema({
  requesterId: { type: String, required: true },
  requesterName: { type: String, required: true },
  requesterEmail: { type: String, required: true },
  requesterRole: { type: String, enum: ["student", "faculty"], required: true },
  requesterIdentifier: { type: String, required: true },
  destination: { type: String, enum: ["admin", "class-teacher", "hod", "higher-management"], required: true },
  recipientPortal: { type: String, enum: ["admin", "faculty"], required: true },
  recipientFaculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", default: null },
  recipientDepartment: { type: String, default: "" },
  subject: { type: String, default: "" },
  issueType: { type: String, required: true },
  description: { type: String, required: true, maxlength: 3000 },
  status: { type: String, enum: ["Open", "In progress", "Resolved"], default: "Open" },
}, { timestamps: true });

supportRequestSchema.index({ recipientPortal: 1, recipientFaculty: 1, recipientDepartment: 1, createdAt: -1 });

export default mongoose.model("SupportRequest", supportRequestSchema);
