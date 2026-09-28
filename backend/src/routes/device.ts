import { Router, Request, Response, NextFunction } from "express";
import { Device, IDevice } from "../models/device.js";
import { Command } from "../models/command.js";
import { Bin } from "../models/bin.js";
import { authenticate } from "../middleware/auth.js";
import { broadcastRealtime } from "./realtime.js";
import { confirmRestart, confirmServoCommand } from "../line/commandResults.js";

const router = Router();

function checkApiKey(req: Request, res: Response, next: NextFunction) {
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
router.get("/poll", checkApiKey, async (req: Request, res: Response) => {
  const timestamp = new Date().toLocaleTimeString();
  const deviceId = String(req.query.deviceId || "").trim();
  const bootId = String(req.query.bootId || "").trim();

  console.log(`\n--------------------------------------------------`);
  console.log(`[${timestamp}] 📥 [POLL REQUEST] deviceId: "${deviceId}"`);

  if (!deviceId) {
    console.error(` ❌ [POLL ERROR] Missing deviceId parameter`);
    return res.status(400).json({
      success: false,
      message: "deviceId is required",
    });
  }

  try {
    // 1. อัปเดต/ค้นหา Device (สร้างใหม่หากยังไม่มี)
    let device = await Device.findOne({ deviceId });
    if (!device) {
      device = new Device({ deviceId, status: "online", lastSeen: new Date() });
    }

    // ตรวจสอบและยืนยันการ Restart ผ่าน bootId
    if (
      device.type === "ESP32" &&
      bootId &&
      /^[a-fA-F0-9]{1,32}$/.test(bootId)
    ) {
      await confirmRestart(device, bootId);
      device.bootId = bootId;
    }

    device.status = "online";
    device.lastSeen = new Date();
    await device.save();

    if (typeof broadcastRealtime === "function") {
      broadcastRealtime(device, "device");
    }

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

    return res.json(responseData);
  } catch (error) {
    console.error(` ❌ [POLL CRITICAL ERROR]:`, error);
    return res.status(500).json({
      success: false,
      message: "Device poll failed",
    });
  }
});

// =====================================================
// Clear restart status after controller receiving acknowledgement
// POST /api/device/ack-restart
// =====================================================
router.post(
  "/ack-restart",
  checkApiKey,
  async (req: Request, res: Response) => {
    const deviceId = String(req.body?.deviceId || "").trim();

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required",
      });
    }

    try {
      const pending = await Device.findOne({
        deviceId,
        type: "ESP32",
        pendingCommand: "restart",
      });

      if (!pending) {
        return res.status(409).json({
          success: false,
          message: "No restart command pending",
        });
      }

      const update =
        pending.lineCommand?.action === "restart"
          ? {
              $set: {
                pendingCommand: null,
                "lineCommand.phase": "restarting",
                "lineCommand.deadlineAt": new Date(Date.now() + 90_000),
              },
            }
          : { $set: { pendingCommand: null } };

      const device = await Device.findOneAndUpdate(
        { deviceId, type: "ESP32", pendingCommand: "restart" },
        update,
        { new: true },
      );

      if (!device) {
        return res.status(409).json({
          success: false,
          message: "No restart command pending",
        });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Restart acknowledgement failed:", error);
      return res.status(500).json({
        success: false,
        message: "Restart acknowledgement failed",
      });
    }
  },
);

// =====================================================
// ESP32 Report
// POST /api/device/report
// =====================================================
router.post("/report", checkApiKey, async (req: Request, res: Response) => {
  const timestamp = new Date().toLocaleTimeString();
  const { deviceId, state, relayStatus, lockStatus } = req.body || {};

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

    let device = await Device.findOne({ deviceId });

    if (!device) {
      console.warn(` ⚠️ [REPORT WARN] Device "${deviceId}" not found in DB`);
      return res.status(404).json({
        success: false,
        message: "Device not registered",
      });
    }

    const currentLockStatus = state || lockStatus;
    const normalizedLockStatus = String(currentLockStatus || "").toLowerCase();
    const reportedState: "on" | "off" | undefined =
      normalizedLockStatus === "on" || normalizedLockStatus === "off"
        ? normalizedLockStatus
        : undefined;

    // 1. ส่งตัวแปร device (IDevice Object) แทนการส่ง device.deviceId (string)
    const confirmed = await confirmServoCommand(device, state);

    if (confirmed && typeof confirmed === "object") {
      device = confirmed as typeof device;
    } else {
      device.status = "online";
      device.lastSeen = new Date();
      if (reportedState) {
        device.state = reportedState;
        if (device.pendingCommand === reportedState && !device.lineCommand) {
          device.pendingCommand = null;
        }
      }
      if (relayStatus !== undefined)
        device.set("metadata.relayStatus", relayStatus);
      if (currentLockStatus !== undefined)
        device.set("metadata.lockStatus", currentLockStatus);
      await device.save();
    }

    if (typeof broadcastRealtime === "function") {
      broadcastRealtime(device, "device");
    }

    console.log(` ✅ [REPORT] Device metadata updated.`);

    // 2. เปลี่ยนสถานะคำสั่งใน DB จาก pending -> acked
    const expectedAction =
      reportedState === "on"
        ? "lock"
        : reportedState === "off"
          ? "unlock"
          : null;

    const pendingCommand = expectedAction
      ? await Command.findOne({
          $or: [
            { deviceId },
            { deviceId: { $exists: false }, binId: device.binId },
          ],
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

    return res.json({
      success: true,
      data: device,
      updatedCommandsCount: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error(` ❌ [REPORT CRITICAL ERROR]:`, error);
    return res.status(500).json({
      success: false,
      message: "Device report failed",
    });
  }
});

export default router;
