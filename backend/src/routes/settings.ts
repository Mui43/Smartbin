import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { MonitoringSettings } from "../models/monitoringSettings.js";
import { Alert } from "../models/alert.js";
import { getMonitoringSettings } from "../services/monitoringSettings.js";
import { sendLineMessageTo } from "../services/line.js";
import { createAuditLog } from "../services/auditLog.js";

const router = Router();
router.use(authenticate);

function maskedTarget(value: string) {
  return value ? `${value.slice(0, 5)}••••${value.slice(-4)}` : "";
}

function lineFailureMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : "";
  if (detail.includes("LINE API Error: 400")) return "LINE ไม่ยอมรับรหัสผู้รับหรือข้อความ";
  if (detail.includes("LINE API Error: 401")) return "Channel Access Token ไม่ถูกต้องหรือหมดอายุ";
  if (detail.includes("LINE API Error: 403")) return "Bot ไม่มีสิทธิ์ส่งข้อความถึงผู้รับนี้";
  if (detail.includes("LINE API Error: 429")) return "LINE จำกัดจำนวนข้อความ กรุณาลองใหม่ภายหลัง";
  if (detail.includes("timeout") || detail.includes("Timeout")) return "เชื่อมต่อ LINE ไม่ทันเวลา";
  return "ส่งข้อความไป LINE ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อและค่าบัญชี";
}

router.get("/", async (req, res) => {
  try {
    const settings = await getMonitoringSettings();
    const saved = await MonitoringSettings.findOne({ key: "main" }).select("lineTargetId").lean();
    res.json({
      success: true,
      data: {
        alerts: {
          offlineAfterSeconds: settings.offlineAfterSeconds,
          lowBatteryPct: settings.lowBatteryPct,
          reminderIntervalMinutes: settings.reminderIntervalMinutes,
        },
        line: {
          tokenConfigured: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()),
          webhookSecretConfigured: Boolean(process.env.LINE_CHANNEL_SECRET?.trim()),
          targetConfigured: Boolean(settings.lineTargetId),
          targetId: req.user?.role === "admin" ? settings.lineTargetId : maskedTarget(settings.lineTargetId),
          source: saved?.lineTargetId === undefined ? "environment" : "settings",
          lastTestAt: settings.lineLastTestAt,
          lastTestStatus: settings.lineLastTestStatus,
          lastTestError: settings.lineLastTestError,
        },
      },
    });
  } catch (error) {
    console.error("Get settings failed:", error);
    res.status(500).json({ success: false, error: { message: "ไม่สามารถโหลดการตั้งค่าได้" } });
  }
});

router.put("/alerts", requireRole("admin"), async (req, res) => {
  const fields = ["offlineAfterSeconds", "lowBatteryPct", "reminderIntervalMinutes"] as const;
  const limits = {
    offlineAfterSeconds: [30, 3600],
    lowBatteryPct: [0, 100],
    reminderIntervalMinutes: [0, 10080],
  } as const;
  for (const field of fields) {
    const value = req.body?.[field];
    if (!Number.isInteger(value) || value < limits[field][0] || value > limits[field][1]) {
      return res.status(400).json({
        success: false,
        error: { message: `${field} ต้องเป็นจำนวนเต็มระหว่าง ${limits[field][0]} และ ${limits[field][1]}` },
      });
    }
  }
  try {
    const before = await getMonitoringSettings();
    const changes = {
      offlineAfterSeconds: req.body.offlineAfterSeconds as number,
      lowBatteryPct: req.body.lowBatteryPct as number,
      reminderIntervalMinutes: req.body.reminderIntervalMinutes as number,
    };
    await MonitoringSettings.findOneAndUpdate(
      { key: "main" },
      { $set: changes },
      { upsert: true, runValidators: true, new: true },
    );
    await createAuditLog({ req, action: "UPDATE_SETTINGS", details: {
      category: "alerts",
      before: {
        offlineAfterSeconds: before.offlineAfterSeconds,
        lowBatteryPct: before.lowBatteryPct,
        reminderIntervalMinutes: before.reminderIntervalMinutes,
      },
      after: changes,
    } });
    res.json({ success: true, data: changes });
  } catch (error) {
    console.error("Update alert settings failed:", error);
    res.status(500).json({ success: false, error: { message: "บันทึกเกณฑ์แจ้งเตือนไม่สำเร็จ" } });
  }
});

router.put("/line", requireRole("admin"), async (req, res) => {
  const raw = req.body?.targetId;
  if (raw !== null && typeof raw !== "string") {
    return res.status(400).json({ success: false, error: { message: "รหัสผู้รับ LINE ไม่ถูกต้อง" } });
  }
  const targetId = raw === null ? null : raw.trim();
  if (targetId && !/^[UCR][0-9a-f]{32}$/i.test(targetId)) {
    return res.status(400).json({
      success: false,
      error: { message: "รหัสผู้รับต้องขึ้นต้นด้วย U, C หรือ R และตามด้วยอักขระ 32 หลัก" },
    });
  }
  try {
    const before = await getMonitoringSettings();
    const update = targetId === null
      ? { $unset: { lineTargetId: 1, lineLastTestAt: 1, lineLastTestStatus: 1, lineLastTestError: 1 } }
      : { $set: { lineTargetId: targetId }, $unset: { lineLastTestAt: 1, lineLastTestStatus: 1, lineLastTestError: 1 } };
    await MonitoringSettings.findOneAndUpdate(
      { key: "main" },
      update,
      { upsert: true, runValidators: true, new: true },
    );
    const settings = await getMonitoringSettings();
    if (settings.lineTargetId !== before.lineTargetId) {
      // An existing alert should reach the newly selected recipient on the next check.
      await Alert.updateMany(
        { active: true },
        { $set: { sentToLine: false }, $unset: { lineLastAttemptAt: 1, lineError: 1 } },
      );
    }
    await createAuditLog({ req, action: "UPDATE_SETTINGS", details: {
      category: "line-recipient",
      before: maskedTarget(before.lineTargetId),
      after: maskedTarget(settings.lineTargetId),
    } });
    res.json({
      success: true,
      data: {
        targetId: settings.lineTargetId,
        targetConfigured: Boolean(settings.lineTargetId),
        source: targetId === null ? "environment" : "settings",
      },
    });
  } catch (error) {
    console.error("Update LINE recipient failed:", error);
    res.status(500).json({ success: false, error: { message: "บันทึกผู้รับ LINE ไม่สำเร็จ" } });
  }
});

router.post("/line/test", requireRole("admin"), async (req, res) => {
  try {
    const settings = await getMonitoringSettings();
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() || !settings.lineTargetId) {
      return res.status(409).json({
        success: false,
        error: { message: "ต้องตั้ง Channel Access Token และรหัสผู้รับก่อนทดสอบ" },
      });
    }
    const testedAt = new Date();
    let deliveryError: unknown = null;
    try {
      await sendLineMessageTo(settings.lineTargetId, "🤖 Smart Bin\n\nทดสอบการแจ้งเตือนจากหน้า Settings สำเร็จ");
    } catch (cause) {
      deliveryError = cause;
    }
    const message = deliveryError ? lineFailureMessage(deliveryError) : null;
    await MonitoringSettings.findOneAndUpdate(
      { key: "main" },
      message
        ? { $set: { lineLastTestAt: testedAt, lineLastTestStatus: "failure", lineLastTestError: message } }
        : { $set: { lineLastTestAt: testedAt, lineLastTestStatus: "success" }, $unset: { lineLastTestError: 1 } },
      { upsert: true, new: true },
    );
    await createAuditLog({ req, action: "TEST_LINE", details: {
      recipient: maskedTarget(settings.lineTargetId),
      result: message ? "failure" : "success",
      ...(message ? { reason: message } : {}),
    } });
    if (message) return res.status(502).json({ success: false, error: { message } });
    return res.json({ success: true, data: { testedAt, recipient: maskedTarget(settings.lineTargetId) } });
  } catch (error) {
    console.error("LINE test failed:", error);
    return res.status(500).json({ success: false, error: { message: "ทดสอบ LINE ไม่สำเร็จ" } });
  }
});

export default router;
