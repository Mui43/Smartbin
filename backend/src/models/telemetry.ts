import mongoose, { Schema, Document } from "mongoose";

export interface ISensorStatus {
  capacitive: "ok" | "warning" | "error" | "offline";
  inductive: "ok" | "warning" | "error" | "offline";
  level: "ok" | "warning" | "error" | "offline";
}

export interface ITelemetry extends Document {
  binId: string;
  level: number;
  sensorStatus: ISensorStatus;
  voltage: number;
  batteryPct: number;
  timestamp: Date;
}

const telemetrySchema = new Schema<ITelemetry>(
  {
    binId: {
      type: String,
      required: true,
      index: true,
    },

    level: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    sensorStatus: {
      capacitive: {
        type: String,
        enum: ["ok", "warning", "error", "offline"],
        required: true,
      },

      inductive: {
        type: String,
        enum: ["ok", "warning", "error", "offline"],
        required: true,
      },

      level: {
        type: String,
        enum: ["ok", "warning", "error", "offline"],
        required: true,
      },
    },

    voltage: {
      type: Number,
      required: true,
      min: 0,
    },

    batteryPct: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },

  {
    timestamps: true,
  }
);

telemetrySchema.index({
  binId: 1,
  timestamp: -1,
});

export const Telemetry =
  mongoose.model<ITelemetry>(
    "Telemetry",
    telemetrySchema
  );