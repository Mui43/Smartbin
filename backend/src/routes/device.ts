import { Router } from "express";
import { Device } from "../models/device.js";
import { Command } from "../models/command.js";

const router = Router();

function checkApiKey(req: any, res: any, next: any) {
  const apiKey = req.header("x-api-key") || req.header("x-device-api-key");
  const expectedKey = process.env.DEVICE_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    console.warn(`\n[AUTH WARNING] ❌ Invalid API Key!`);
    console.warn(` - Received Header: "${apiKey}"`);
    console.warn(` - Expected Env:    "${expectedKey}"`);
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
  const timestamp = new Date().toLocaleTimeString();
  const deviceId = String(req.query.deviceId || "");

  console.log(`\n--------------------------------------------------`);
  console.log(`[${timestamp}] 📥 [POLL REQUEST] deviceId: "${deviceId}"`);

  try {
    if (!deviceId) {
      console.error(` ❌ [POLL ERROR] Missing deviceId parameter`);
      return res.status(400).json({
        success: false,
        message: "deviceId is required",
      });
    }

    // 1. อัปเดตสถานะ Device (ถ้ายังไม่มีใน DB จะสร้างให้อัตโนมัติด้วย upsert)
    const device = await Device.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          status: "online",
          lastSeen: new Date(),
        },
      },
      { new: true, upsert: true },
    );

    console.log(
      ` ✅ [POLL] Device Online OK (binId: "${device.binId || "N/A"}")`,
    );

    // 2. ค้นหาคำสั่ง pending ใน Command Collection
    const isLockDevice = /^servo-lock-/i.test(deviceId);
    const pendingCommand = isLockDevice
      ? await Command.findOne({
          $or: [
            { deviceId },
            { deviceId: { $exists: false }, binId: device.binId },
          ],
          status: "pending",
          action: { $in: ["lock", "unlock"] },
        }).sort({ createdAt: 1 })
      : null;

    if (pendingCommand) {
      console.log(` 🎯 [POLL COMMAND FOUND] Found Pending Command:`);
      console.log(`    - Doc ID: ${pendingCommand._id}`);
      console.log(`    - Action: "${pendingCommand.action}"`);
      console.log(`    - Target deviceId: "${pendingCommand.deviceId}"`);
      console.log(`    - Target binId: "${pendingCommand.binId}"`);
    } else {
      console.log(
        ` 💤 [POLL NO COMMAND] No "pending" status found for this device.`,
      );
    }

    const responseData = {
      success: true,
      data: {
        deviceId: device.deviceId,
        status: device.status,
        lastSeen: device.lastSeen,
        action: pendingCommand ? pendingCommand.action : null,
        command: pendingCommand ? pendingCommand.action : null,
      },
    };

    console.log(` 📤 [POLL RESPONSE] Payload:`, JSON.stringify(responseData));
    console.log(`--------------------------------------------------`);

    res.json(responseData);
  } catch (error) {
    console.error(` ❌ [POLL CRITICAL ERROR]:`, error);
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
  const timestamp = new Date().toLocaleTimeString();
  const { deviceId, state, relayStatus, lockStatus } = req.body;

  console.log(`\n==================================================`);
  console.log(
    `[${timestamp}] 📥 [REPORT REQUEST] Body:`,
    JSON.stringify(req.body),
  );

  try {
    if (!deviceId) {
      console.error(` ❌ [REPORT ERROR] Missing deviceId in body`);
      return res.status(400).json({
        success: false,
        message: "deviceId is required",
      });
    }

    const currentLockStatus = state || lockStatus;
    const normalizedLockStatus = String(currentLockStatus || "").toLowerCase();
    const reportedState = ["on", "off"].includes(normalizedLockStatus)
      ? normalizedLockStatus
      : undefined;

    // 1. อัปเดต Device Metadata
    const device = await Device.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          status: "online",
          lastSeen: new Date(),
          ...(reportedState ? { state: reportedState, pendingCommand: null } : {}),
          "metadata.relayStatus": relayStatus,
          "metadata.lockStatus": currentLockStatus,
        },
      },
      { new: true },
    );

    if (!device) {
      console.warn(` ⚠️ [REPORT WARN] Device "${deviceId}" not found in DB`);
      return res.status(404).json({
        success: false,
        message: "Device not registered",
      });
    }

    console.log(` ✅ [REPORT] Device metadata updated.`);

    // 2. เปลี่ยนสถานะคำสั่งใน DB จาก pending -> acked
    const expectedAction = reportedState === "on" ? "lock" : reportedState === "off" ? "unlock" : null;
    const pendingCommand = expectedAction
      ? await Command.findOne({
          $or: [{ deviceId }, { deviceId: { $exists: false }, binId: device.binId }],
          status: "pending",
          action: expectedAction,
        }).sort({ createdAt: 1 })
      : null;
    const updateResult = pendingCommand
      ? await Command.updateOne(
          { _id: pendingCommand._id, status: "pending" },
          { $set: { status: "acked", updatedAt: new Date() } },
        )
      : { matchedCount: 0, modifiedCount: 0 };

    console.log(` 🔄 [REPORT DB UPDATE] Command Status Change:`);
    console.log(`    - Found Matches: ${updateResult.matchedCount}`);
    console.log(
      `    - Updated Docs:  ${updateResult.modifiedCount} (pending -> acked)`,
    );
    console.log(`==================================================`);

    res.json({
      success: true,
      data: device,
      updatedCommandsCount: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error(` ❌ [REPORT CRITICAL ERROR]:`, error);
    res.status(500).json({
      success: false,
      message: "Device report failed",
    });
  }
});

export default router;
