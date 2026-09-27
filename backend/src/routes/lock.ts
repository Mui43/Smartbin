import { Router } from "express";
import { Bin } from "../models/bin.js";
import { Device } from "../models/device.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { createAuditLog } from "../services/auditLog.js";

const router = Router();

const lockDeviceFilter = (binId: string) => ({ binId, type: "SERVO_MOTOR" as const, deviceId: /^servo-lock-/i });

router.get("/:id/lock", authenticate, async (req, res) => {
  try {
    const device = await Device.findOne(lockDeviceFilter(String(req.params.id))).lean();
    if (!device) return res.status(404).json({ success: false, error: { message: "ไม่พบ Servo Lock ที่ลงทะเบียนกับถังนี้" } });
    res.json({ success: true, data: { state: device.state ?? "unknown", pendingCommand: device.pendingCommand ?? null, online: device.status === "online" && Boolean(device.lastSeen && Date.now() - new Date(device.lastSeen).getTime() < 60000) } });
  } catch { res.status(500).json({ success: false, error: { message: "ไม่สามารถโหลดสถานะล็อกได้" } }); }
});

router.post(
  "/:id/lock",
  authenticate,
  requireRole("admin", "staff"),
  async (req, res) => {
    try {
      const binId = String(req.params.id);
      const { action } = req.body;

      if (action !== "lock" && action !== "unlock") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LOCK_ACTION",
            message: "Action must be lock or unlock",
          },
        });
      }

      const bin = await Bin.findOne({ binId });

      if (!bin) {
        return res.status(404).json({
          success: false,
          error: {
            code: "BIN_NOT_FOUND",
            message: "Bin not found",
          },
        });
      }

      const device = await Device.findOne(lockDeviceFilter(binId));
      if (!device) return res.status(404).json({ success: false, error: { message: "ไม่พบ Servo Lock ที่ลงทะเบียนกับถังนี้" } });
      if (device.status !== "online" || !device.lastSeen || Date.now() - device.lastSeen.getTime() > 60000) {
        return res.status(409).json({ success: false, error: { message: "Servo Lock ออฟไลน์ กรุณาตรวจ ESP32" } });
      }
      device.pendingCommand = action === "lock" ? "on" : "off";
      await device.save();

      await createAuditLog({
        req,
        action:
          action === "lock"
            ? "LOCK"
            : "UNLOCK",
        binId,
        details: {
          action,
          deviceId: device.deviceId,
          delivery: "device-poll",
          message:
            action === "lock"
              ? "Lock command sent"
              : "Unlock command sent",
        },
      });

      res.json({
        success: true,
        data: {
          binId,
          action,
          requestedBy: {
            id: req.user?.id,
            email: req.user?.email,
            role: req.user?.role,
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Lock API error:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "LOCK_COMMAND_FAILED",
          message: "Unable to send lock command",
        },
      });
    }
  }
);

export default router;
