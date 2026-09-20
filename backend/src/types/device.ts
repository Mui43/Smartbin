import { ObjectId } from "mongodb";

export interface DeviceDocument {
  _id?: ObjectId;
  deviceId: string;
  pendingCommand: "on" | "off" | null;
  state: "on" | "off" | "unknown";
  lastSeen: Date;
  lastCommandBy?: string;
  lastCommandAt?: Date;
}
