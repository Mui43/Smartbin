import { Router, Request, Response } from "express";
import crypto from "crypto";
import { sendLineMessage, replyLineMessage } from "../services/line";
import { getDb } from "../lib/mongodb";
import { DeviceDocument } from "../types/device";

const router = Router();

// Middleware ตรวจสอบ LINE Signature
const verifyLineSignature = (req: Request, res: Response, next: Function) => {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const signature = req.headers["x-line-signature"] as string;

  if (!channelSecret || !signature) {
    return res.status(401).json({ error: "Missing secret or signature" });
  }

  const body =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");

  if (hash !== signature) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  next();
};

// 1. POST /api/line/test
router.post("/test", async (_req: Request, res: Response) => {
  try {
    await sendLineMessage(
      "🤖 Smart Bin Test\n\nระบบเชื่อมต่อ LINE สำเร็จแล้ว ✅",
    );
    return res.json({ success: true, message: "LINE message sent" });
  } catch (error) {
    console.error("LINE test error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "LINE_SEND_FAILED",
        message: "Unable to send LINE message",
      },
    });
  }
});

// 2. POST /api/line/webhook
router.post(
  "/webhook",
  verifyLineSignature,
  async (req: Request, res: Response) => {
    try {
      const events = req.body.events || [];
      const allowedUserIds = (process.env.ALLOWED_USER_IDS || "")
        .split(",")
        .map((id) => id.trim());

      for (const event of events) {
        const userId = event.source?.userId;

        // 🟢 ปริ้นท์ Log แสดง LINE User ID และ Event ทุกครั้งที่มีคนส่งข้อความหรือกดปุ่ม
        console.log("\n========================================");
        console.log(`📩 New Event from User ID: [ ${userId} ]`);

        if (event.type === "message" && event.message.type === "text") {
          console.log(`💬 Message Text: "${event.message.text}"`);
        } else if (event.type === "postback") {
          console.log(`🔘 Postback Data: "${event.postback.data}"`);
        }
        console.log("========================================\n");

        // Check Whitelist
        // 🟢 ถ้ากำหนด ALLOWED_USER_IDS เป็น "*" หรือไม่มีการระบุ ให้ข้ามการเช็ค Whitelist (อนุญาตทุกคน)
        const allowAll = process.env.ALLOWED_USER_IDS === "*";

        if (!allowAll && (!userId || !allowedUserIds.includes(userId))) {
          console.warn(
            `⚠️ Unauthorized access attempt from User ID: ${userId}`,
          );
          if (event.replyToken) {
            await replyLineMessage(
              event.replyToken,
              "⛔ คุณไม่มีสิทธิ์ใช้งานระบบนี้ (Unauthorized)",
            );
          }
          continue;
        }

        let action: string | null = null;

        // รองรับกรณีรับค่าแบบ Text จาก Rich Menu (On, Off, Status, Clear)
        if (event.type === "message" && event.message.type === "text") {
          // แปลงข้อความให้เป็นอักษรเล็ก และตัดช่องว่างออก
          let text = event.message.text.trim().toLowerCase();

          // ตัดคำว่า "action = " ออกหากผู้ใช้ส่งรูปแบบ "Action = On" หรือ "Action = Status" มา
          if (text.startsWith("action = ")) {
            text = text.replace("action = ", "").trim();
          }

          if (["on", "off", "status", "clear"].includes(text)) {
            action = text;
          }
        }

        // ถ้ามี Action ตรงตามคำสั่ง ให้ประมวลผลคำสั่งลง MongoDB
        if (action) {
          const deviceId = "esp32-01";
          const db = await getDb();
          const collection = db.collection<DeviceDocument>("devices");
          const now = new Date();

          if (action === "on" || action === "off") {
            await collection.updateOne(
              { deviceId },
              {
                $set: {
                  pendingCommand: action,
                  lastCommandBy: userId,
                  lastCommandAt: now,
                },
              },
              { upsert: true },
            );

            const actionText = action === "on" ? "เปิด" : "ปิด";
            await replyLineMessage(
              event.replyToken,
              `🟢 บันทึกคำสั่ง "${actionText}เครื่อง" เรียบร้อยแล้ว กำลังส่งไปยังอุปกรณ์...`,
            );
          } else if (action === "status") {
            const device = await collection.findOne({ deviceId });
            if (!device) {
              await replyLineMessage(
                event.replyToken,
                "⚠️ ไม่พบข้อมูลอุปกรณ์ในระบบ",
              );
              continue;
            }

            const isOnline =
              device.lastSeen &&
              now.getTime() - new Date(device.lastSeen).getTime() < 30000;

            const statusText =
              `📡 สถานะอุปกรณ์ (${deviceId})\n` +
              `• การเชื่อมต่อ: ${isOnline ? "🟢 ออนไลน์" : "🔴 ออฟไลน์"}\n` +
              `• สถานะปัจจุบัน: ${device.state || "unknown"}\n` +
              `• คำสั่งที่ค้างอยู่: ${device.pendingCommand || "ไม่มี"}`;

            await replyLineMessage(event.replyToken, statusText);
          } else if (action === "clear") {
            await collection.updateOne(
              { deviceId },
              {
                $set: {
                  pendingCommand: null,
                  state: "unknown",
                },
              },
              { upsert: true },
            );

            await replyLineMessage(
              event.replyToken,
              "🧹 ล้างสถานะอุปกรณ์เรียบร้อยแล้ว",
            );
          }
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("LINE Webhook Error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
