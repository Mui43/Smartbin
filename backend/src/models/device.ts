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

export type DeviceStatus = "online" | "offline" | "warning";

export interface ILineCommand {
  to: string;
  action: "lock" | "unlock" | "restart";
  binName: string;
  requestedAt: Date;
  deadlineAt: Date;
  phase: "queued" | "restarting" | "result";
  bootIdAtRequest?: string;
  resultText?: string;
  retryKey: string;
  nextDeliveryAt?: Date;
  deliveryAttempts?: number;
}

export interface IDevice extends Document {
  deviceId: string;
  binId: string;
  name: string;
  type: DeviceType;
  description?: string;
  status: DeviceStatus;
  lastSeen?: Date;
  state?: "on" | "off" | "unknown";
  pendingCommand?: "on" | "off" | "restart" | null;
  bootId?: string;
  lineCommand?: ILineCommand | null;
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
      enum: ["online", "offline", "warning"],
      default: "offline",
    },

    lastSeen: {
      type: Date,
    },

    state: {
      type: String,
      enum: ["on", "off", "unknown"],
      default: "unknown",
    },

    pendingCommand: {
      type: String,
      enum: ["on", "off", "restart"],
      default: null,
    },

    bootId: { type: String },
    lineCommand: {
      type: new Schema<ILineCommand>({
        to: { type: String, required: true },
        action: { type: String, enum: ["lock", "unlock", "restart"], required: true },
        binName: { type: String, required: true },
        requestedAt: { type: Date, required: true },
        deadlineAt: { type: Date, required: true },
        phase: { type: String, enum: ["queued", "restarting", "result"], required: true },
        bootIdAtRequest: String,
        resultText: String,
        retryKey: { type: String, required: true },
        nextDeliveryAt: Date,
        deliveryAttempts: { type: Number, default: 0 },
      }, { _id: false }),
      default: null,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

export const Device = mongoose.model<IDevice>("Device", deviceSchema);
