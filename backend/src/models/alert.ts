import mongoose, { Schema, Document } from "mongoose";

export interface IAlert extends Document {
  binId: string;
  type:
    | "FULL"
    | "NEAR_FULL"
    | "SENSOR_ERROR"
    | "LOW_BATTERY"
    | "OFFLINE";

  level: "warning" | "critical";

  message: string;

  active: boolean;

  sentToLine: boolean;

  createdAt: Date;
  resolvedAt?: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    binId: {
      type: String,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "FULL",
        "NEAR_FULL",
        "SENSOR_ERROR",
        "LOW_BATTERY",
        "OFFLINE",
      ],
      required: true,
    },

    level: {
      type: String,
      enum: ["warning", "critical"],
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    sentToLine: {
      type: Boolean,
      default: false,
    },

    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({
  binId: 1,
  type: 1,
  active: 1,
});

export const Alert = mongoose.model<IAlert>(
  "Alert",
  alertSchema
);