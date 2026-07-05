import mongoose, { Schema, Document } from "mongoose";

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  targetUserId: mongoose.Types.ObjectId;
  reason: string;
  additionalDetails?: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: Date;
}

const ReportSchema: Schema = new Schema({
  reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  targetUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reason: {
    type: String,
    required: true,
    enum: ["spam", "harassment", "inappropriate_content", "fake_profile", "fraud_or_scam", "other"],
    set: (v: any) => typeof v === 'string' ? v.toLowerCase() : v
  },
  additionalDetails: { type: String, maxlength: 500 },
  status: { type: String, enum: ["pending", "reviewed", "resolved"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

// Avoid duplicate reports from the same user on the same target within a short timeframe
ReportSchema.index({ reporterId: 1, targetUserId: 1 }, { unique: true });

export default mongoose.model<IReport>("Report", ReportSchema);