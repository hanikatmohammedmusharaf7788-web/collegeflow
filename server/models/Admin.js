import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  tokenVersion: { type: Number, default: 0, min: 0 },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  role: { type: String, default: "admin" },
}, { timestamps: true });

export default mongoose.model("Admin", adminSchema);
