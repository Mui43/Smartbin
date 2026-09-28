import { Router } from "express";
import { Device } from "../models/device.js";
import { Command } from "../models/command.js"; // 🟢 1. Import Command Model ที่คุณมีอยู่แล้ว

const router = Router();

// 🟢 รองรับทั้ง x-api-key และ x-device-api-key
function checkApiKey(req: any, res: any, next: any) {
  const apiKey = req.header("x-api-key") || req.header("x-device-api-key");

  if (!process.env.DEVICE_API_KEY || apiKey !== process.env.DEVICE_API_KEY) {
    return res.status(401).json({
      success: false,
      message: "Invalid device API key",
    });
  }

  next();
}

// =====================================================
// ESP32 Heartbeat & Command Polling
// GET /api/device/poll?deviceId=servo-lock-A001
// =====================================================
router.get("/poll", checkApiKey, async (req, res) => {
  try {
    const deviceId = String(req.query.deviceId || "");

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required",
      });
    }

    // 1. อัปเดตสถานะออนไลน์ของอุปกรณ์
    const device = await Device.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          status: "online",
          lastSeen: new Date(),
        },
      },
      { new: true },
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not registered",
      });
    }

    // 🟢 2. ดึงคำสั่งค้าง (pending) ล่าสุดจาก Command Model
    // ค้นหาได้ทั้งจาก deviceId หรือ binId
    const pendingCommand = await Command.findOne({
      $or: [{ deviceId }, { binId: device.binId }],
      status: "pending",
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        status: device.status,
        lastSeen: device.lastSeen,
        // ส่ง action เช่น "unlock" หรือ "lock" ไปให้ ESP32
        action: pendingCommand ? pendingCommand.action : null,
        command: pendingCommand ? pendingCommand.action : null,
      },
    });
  } catch (error) {
    console.error("Device poll error:", error);
    res.status(500).json({
      success: false,
      message: "Device poll failed",
    });
  }
});

// =====================================================
// ESP32 Report
// POST /api/device/report
// =====================================================
router.post("/report", checkApiKey, async (req, res) => {
  try {
    const { deviceId, state, relayStatus, lockStatus } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required",
      });
    }

    const currentLockStatus = state || lockStatus;

    // 1. อัปเดต metadata ของ Device
    const device = await Device.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          status: "online",
          lastSeen: new Date(),
          "metadata.relayStatus": relayStatus,
          "metadata.lockStatus": currentLockStatus,
        },
      },
      { new: true },
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not registered",
      });
    }

    // 🟢 2. เปลี่ยนสถานะคำสั่งจาก "pending" เป็น "acked" ใน MongoDB
    await Command.updateMany(
      {
        $or: [{ deviceId }, { binId: device.binId }],
        status: "pending",
      },
      {
        $set: {
          status: "acked", // ใช้ "acked" ตาม enum ใน Schema
        },
      },
    );

    res.json({
      success: true,
      data: device,
    });
  } catch (error) {
    console.error("Device report error:", error);
    res.status(500).json({
      success: false,
      message: "Device report failed",
    });
  }
});

export default router;
