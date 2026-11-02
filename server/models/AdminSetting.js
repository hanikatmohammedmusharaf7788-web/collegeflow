import mongoose from "mongoose";

const adminSettingSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "portal" },
  collegeName: { type: String, default: "Hanikat's College of Engineering & Technology (HCET)" },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  passwordPolicy: { type: String, enum: ["Basic", "Strong", "Very strong"], default: "Strong" },
}, { timestamps: true });

export default mongoose.model("AdminSetting", adminSettingSchema);
