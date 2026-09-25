import mongoose, { Schema, Document } from "mongoose";

export type DeviceType =
  | "ESP32"
  | "IR_SENSOR"
  | "PROXIMITY_SENSOR"
  | "ULTRASONIC_SENSOR"
  | "SERVO_MOTOR"
  | "BUZZER"
  | "DOOR_LOCK"
  | "OTHER";

export type DeviceStatus =
  | "online"
  | "offline"
  | "warning";

export interface IDevice extends Document {
  deviceId: string;
  binId: string;
  name: string;
  type: DeviceType;
  description?: string;
  status: DeviceStatus;
  lastSeen?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    binId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "ESP32",
        "IR_SENSOR",
        "PROXIMITY_SENSOR",
        "ULTRASONIC_SENSOR",
        "SERVO_MOTOR",
        "BUZZER",
        "DOOR_LOCK",
        "OTHER",
      ],
      required: true,
    },

    description: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "online",
        "offline",
        "warning",
      ],
      default: "offline",
    },

    lastSeen: {
      type: Date,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const Device =
  mongoose.model<IDevice>("Device", deviceSchema);