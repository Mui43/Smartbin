import mongoose, { Schema, Document } from "mongoose";

export interface IMonitoringSettings extends Document {
  key: "main";
  lineTargetId?: string;
  offlineAfterSeconds: number;
  lowBatteryPct: number;
  reminderIntervalMinutes: number;
  lineLastTestAt?: Date;
  lineLastTestStatus?: "success" | "failure";
  lineLastTestError?: string;
}

const monitoringSettingsSchema = new Schema<IMonitoringSettings>(
  {
    key: { type: String, enum: ["main"], unique: true, required: true },
    lineTargetId: { type: String, trim: true },
    offlineAfterSeconds: { type: Number, min: 30, max: 3600, default: 60 },
    lowBatteryPct: { type: Number, min: 0, max: 100, default: 20 },
    reminderIntervalMinutes: { type: Number, min: 0, max: 10080, default: 0 },
    lineLastTestAt: Date,
    lineLastTestStatus: { type: String, enum: ["success", "failure"] },
    lineLastTestError: String,
  },
  { timestamps: true },
);

export const MonitoringSettings = mongoose.model<IMonitoringSettings>(
  "MonitoringSettings",
  monitoringSettingsSchema,
);
