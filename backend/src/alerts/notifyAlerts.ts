import { Alert } from "../models/alert.js";
import { sendLineMessage } from "../services/line.js";
import { checkBinAlerts } from "./checkAlerts.js";
import { Bin } from "../models/bin.js";

const checkingBins = new Set<string>();
const RETRY_MS = 60_000;

export function startAlertChecker() {
  const check = async () => {
    try {
      const bins = await Bin.find().select("binId").lean();
      for (const bin of bins) await notifyBinAlerts(bin.binId);
    } catch (error) {
      console.error("Alert checker failed:", error);
    }
  };
  void check();
  setInterval(() => { void check(); }, RETRY_MS).unref();
}

export async function notifyBinAlerts(binId: string) {
  if (checkingBins.has(binId)) return;
  checkingBins.add(binId);
  try {
    console.log(`🔎 Checking alerts for ${binId}`);

    const currentAlerts = await checkBinAlerts(binId);

    console.log(
      `🚨 Current alerts: ${currentAlerts.length}`
    );

    // ==========================================
    // 1. Resolve alerts ที่ไม่เกิดขึ้นแล้ว
    // ==========================================

    const activeAlerts = await Alert.find({
      binId,
      active: true,
    });

    for (const oldAlert of activeAlerts) {
      const stillExists = currentAlerts.some(
        (alert) => alert.type === oldAlert.type
      );

      if (!stillExists) {
        oldAlert.active = false;
        oldAlert.resolvedAt = new Date();

        await oldAlert.save();

        console.log(
          `✅ Alert resolved: ${binId} ${oldAlert.type}`
        );
      }
    }

    // ==========================================
    // 2. ตรวจ Alert ปัจจุบัน
    // ==========================================

    for (const alert of currentAlerts) {
      console.log(
        `🚨 Alert detected: ${binId} ${alert.type}`
      );

      const existingAlert = await Alert.findOne({
        binId,
        type: alert.type,
        active: true,
      });

      // มี Alert เดิมอยู่แล้ว
      if (existingAlert?.sentToLine || (existingAlert?.lineLastAttemptAt && Date.now() - existingAlert.lineLastAttemptAt.getTime() < RETRY_MS)) {
        console.log(
          `ℹ️ Alert already active: ${binId} ${alert.type}`
        );

        continue;
      }

      // ==========================================
      // 3. สร้าง Alert ใน MongoDB
      // ==========================================

      const newAlert = existingAlert ?? await Alert.create({
        binId,
        type: alert.type,
        level: alert.level,
        message: alert.message,
        active: true,
        sentToLine: false,
      });

      console.log(
        `💾 Alert created: ${binId} ${alert.type}`
      );

      // ==========================================
      // 4. ส่ง LINE
      // ==========================================

      try {
        newAlert.lineLastAttemptAt = new Date();
        await newAlert.save();
        const message =
          `🤖 Smart Bin Alert\n\n` +
          `🗑️ Bin: ${binId}\n` +
          `⚠️ ${alert.message}\n` +
          `ระดับ: ${
            alert.level === "critical"
              ? "วิกฤต"
              : "แจ้งเตือน"
          }\n\n` +
          `กรุณาตรวจสอบถัง`;

        console.log("📤 Sending LINE message...");

        await sendLineMessage(message);

        newAlert.sentToLine = true;
        newAlert.lineError = undefined;

        await newAlert.save();

        console.log(
          `📱 LINE alert sent: ${binId} ${alert.type}`
        );
      } catch (error) {
        newAlert.lineError = error instanceof Error ? error.message : "LINE notification failed";
        await newAlert.save();
        console.error(
          "❌ LINE notification failed:",
          error
        );
      }
    }
  } catch (error) {
    console.error(
      "❌ Alert notification error:",
      error
    );
  } finally {
    checkingBins.delete(binId);
  }
}
