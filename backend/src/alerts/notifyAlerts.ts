import { Alert } from "../models/alert.js";
import { sendLineMessage } from "../services/line.js";
import { checkBinAlerts } from "./checkAlerts.js";

export async function notifyBinAlerts(
  binId: string
) {
  try {
    const currentAlerts =
      await checkBinAlerts(binId);

    /*
     * 1. ตรวจ Alert ที่เคย Active
     * แต่ตอนนี้ไม่เกิดขึ้นแล้ว
     */
    const activeAlerts = await Alert.find({
      binId,
      active: true,
    });

    for (const oldAlert of activeAlerts) {
      const stillExists =
        currentAlerts.some(
          (alert) =>
            alert.type === oldAlert.type
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

    /*
     * 2. ตรวจ Alert ปัจจุบัน
     */
    for (const alert of currentAlerts) {
      const existingAlert =
        await Alert.findOne({
          binId,
          type: alert.type,
          active: true,
        });

      /*
       * มี Alert เดิมอยู่แล้ว
       * ไม่ต้องส่ง LINE ซ้ำ
       */
      if (existingAlert) {
        continue;
      }

      /*
       * 3. สร้าง Alert ใหม่ใน MongoDB
       */
      const newAlert = await Alert.create({
        binId,
        type: alert.type,
        level: alert.level,
        message: alert.message,
        active: true,
        sentToLine: false,
      });

      /*
       * 4. ส่ง LINE
       */
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