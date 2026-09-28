import mongoose, { Schema, Document, Model } from "mongoose";

// 1. กำหนด TypeScript Interface (เพื่อให้ Auto-complete ในโค้ดทำงาน)
export interface ICommand extends Document {
  binId: string;
  deviceId?: string;
  action: "lock" | "unlock" | "clear";
  source: "web" | "line";
  status: "pending" | "processing" | "acked" | "failed";
  requestedBy?: {
    id?: string;
    email?: string;
    role?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 2. กำหนด Mongoose Schema (โครงสร้างการเก็บข้อมูลลง MongoDB จริง)
const CommandSchema: Schema = new Schema<ICommand>(
  {
    binId: { type: String, required: true, index: true },
    deviceId: { type: String },
    action: {
      type: String,
      enum: ["lock", "unlock", "clear"],
      required: true,
    },
    source: {
      type: String,
      enum: ["web", "line"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "acked", "failed"],
      default: "pending",
      index: true,
    },
    requestedBy: {
      id: { type: String },
      email: { type: String },
      role: { type: String },
    },
  },
  {
    timestamps: true, // สร้าง createdAt และ updatedAt ให้อัตโนมัติ
  },
);

// สร้าง Index ผสม เพื่อให้ค้นหาคิวที่ pending ของ bin นั้นๆ ได้เร็วที่สุด
CommandSchema.index({ binId: 1, status: 1, createdAt: 1 });

// 3. Export Model ออกไปใช้งาน
export const Command: Model<ICommand> =
  mongoose.models.Command || mongoose.model<ICommand>("Command", CommandSchema);
