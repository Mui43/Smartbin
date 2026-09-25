import mongoose, { Schema, Document } from "mongoose";

export interface IWasteEvent extends Document {
  binId: string;
  sensor: "ir";
  timestamp: Date;
}

const wasteEventSchema = new Schema<IWasteEvent>(
  {
    binId: {
      type: String,
      required: true,
      index: true,
    },

    sensor: {
      type: String,
      enum: ["ir"],
      default: "ir",
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

wasteEventSchema.index({
  binId: 1,
  timestamp: -1,
});

export const WasteEvent =
  mongoose.model<IWasteEvent>(
    "WasteEvent",
    wasteEventSchema
  );