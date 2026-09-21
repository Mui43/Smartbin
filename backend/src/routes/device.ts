import { Router, Request, Response } from "express";
import { getDb } from "../lib/mongodb";
import { DeviceDocument } from "../types/device";

const router = Router();

// Middleware ตรวจสอบ API Key ของ ESP32
const verifyApiKey = (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== process.env.DEVICE_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// GET /api/device/poll?deviceId=...
router.get("/poll", verifyApiKey, async (req: Request, res: Response) => {
  try {
    const deviceId = req.query.deviceId as string;
    if (!deviceId) {
      return res.status(400).json({ error: "deviceId is required" });
    }

    const db = await getDb();
    const collection = db.collection<DeviceDocument>("devices");

    const now = new Date();
    const device = await collection.findOneAndUpdate(
      { deviceId },
      { $set: { lastSeen: now } },
      { returnDocument: "after", upsert: true },
    );

    return res.json({ command: device?.pendingCommand ?? null });
  } catch (error) {
    console.error("Poll Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/device/report
router.post("/report", verifyApiKey, async (req: Request, res: Response) => {
  try {
    const { deviceId, state } = req.body;
    if (!deviceId || !["on", "off"].includes(state)) {
      return res.status(400).json({ error: "Invalid deviceId or state" });
    }

    const db = await getDb();
    const collection = db.collection<DeviceDocument>("devices");

    const now = new Date();
    await collection.updateOne(
      { deviceId },
      {
        $set: {
          state: state as "on" | "off",
          pendingCommand: null,
          lastSeen: now,
        },
      },
      { upsert: true },
    );

    return res.json({ success: true });
  } catch (error) {
    console.error("Report Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
