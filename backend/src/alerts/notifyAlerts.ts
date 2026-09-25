import { Alert } from "../models/alert.js";
import { sendLineMessage } from "../services/line.js";
import { checkBinAlerts } from "./checkAlerts.js";

export async function notifyBinAlerts(binId: string) {
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
      if (existingAlert) {
        console.log(
          `ℹ️ Alert already active: ${binId} ${alert.type}`
        );

        continue;
      }

      // ==========================================
      // 3. สร้าง Alert ใน MongoDB
      // ==========================================

      const newAlert = await Alert.create({
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

        await newAlert.save();

        console.log(
          `📱 LINE alert sent: ${binId} ${alert.type}`
        );
      } catch (error) {
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
  }
}