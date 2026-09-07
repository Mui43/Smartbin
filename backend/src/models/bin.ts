import mongoose, { Schema, Document } from "mongoose";

export interface IBin extends Document {
  binId: string;
  name: string;
  location: string;
  mqttTopic: string;
  thresholdPct: number;
  createdAt: Date;
  updatedAt: Date;
}

const binSchema = new Schema<IBin>(
  {
    binId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    mqttTopic: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    thresholdPct: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 85,
    },
  },
  {
    timestamps: true,
  }
);

export const Bin = mongoose.model<IBin>("Bin", binSchema);