import { Router, Request, Response } from "express";
import crypto from "crypto";
import { sendLineMessage, replyLineMessage } from "../services/line.js";
import { Bin } from "../models/bin.js";
import { Command } from "../models/command.js";
import { Device } from "../models/device.js";
import {
  createBinCarouselFlex,
  getQuickReplyMenu,
} from "../services/lineHelper.js";

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
      "🤖 Smart Bin Test\n\nระบบเชื่อมต่อ LINE สำเร็จแล้ว ✅"
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

        console.log("\n========================================");
        console.log(`📩 New Event from User ID: [ ${userId} ]`);

        if (event.type === "message" && event.message.type === "text") {
          console.log(`💬 Message Text: "${event.message.text}"`);
        } else if (event.type === "postback") {
          console.log(`🔘 Postback Data: "${event.postback.data}"`);
        }
        console.log("========================================\n");

        // Check Whitelist
        const allowAll = process.env.ALLOWED_USER_IDS === "*";

        if (!allowAll && (!userId || !allowedUserIds.includes(userId))) {
          console.warn(
            `⚠️ Unauthorized access attempt from User ID: ${userId}`
          );
          if (event.replyToken) {
            await replyLineMessage(
              event.replyToken,
              "⛔ คุณไม่มีสิทธิ์ใช้งานระบบนี้ (Unauthorized)"
            );
          }
          continue;
        }

        let action: "lock" | "unlock" | "status" | "clear" | null = null;
        let targetBinId: string | undefined = undefined;

        // 🟢 1. ดักจับข้อความพิมพ์ (Text Message)
        if (event.type === "message" && event.message.type === "text") {
          let text = event.message.text.trim().toLowerCase();

          if (text.startsWith("action = ") || text.startsWith("action=")) {
            text = text.replace(/action\s*=\s*/, "").trim();
          }

          const match = text.match(
            /^(ล็อก|ปลดล็อก|lock|unlock|clear|เคลียร์ขยะ)\s*(.*)$/i
          );
          if (match) {
            const cmd = match[1].toLowerCase();
            targetBinId = match[2].trim().toUpperCase() || undefined;

            if (["lock", "ล็อก"].includes(cmd)) action = "lock";
            else if (["unlock", "ปลดล็อก"].includes(cmd)) action = "unlock";
            else if (["clear", "เคลียร์ขยะ"].includes(cmd)) action = "clear";
          } else if (
            ["status", "สถานะ", "เช็คสถานะ", "เช็กสถานะ", "ถังขยะ", "bin"].includes(text) ||
            text.includes("สถานะ")
          ) {
            action = "status";
          }
        }
        // 🟢 2. ดักจับปุ่มกดจาก Postback
        else if (event.type === "postback") {
          const data = event.postback.data;
          const params = new URLSearchParams(data);
          const act = params.get("action")?.toLowerCase();
          targetBinId = params.get("binId")?.toUpperCase() || undefined;

          if (act === "lock" || act === "on") action = "lock";
          else if (act === "unlock" || act === "off") action = "unlock";
          else if (act === "status") action = "status";
          else if (act === "clear") action = "clear";
        }

        // 🟢 3. ประมวลผลคำสั่ง
        if (action) {
          // หากไม่มีการระบุ binId มา จะใช้ binId แรกสุดในระบบเป็น Default
          if (!targetBinId && action !== "status") {
            const firstBin = await Bin.findOne().sort({ createdAt: 1 });
            targetBinId = firstBin?.binId || "BIN001";
          }

          // CASE 1: สั่ง Lock หรือ Unlock
          if (action === "lock" || action === "unlock") {
            if (!targetBinId) {
              await replyLineMessage(
                event.replyToken,
                "❌ ไม่พบรหัสถังขยะที่ระบุ"
              );
              continue;
            }

            const bin = await Bin.findOne({ binId: targetBinId });
            if (!bin) {
              await replyLineMessage(
                event.replyToken,
                `❌ ไม่พบข้อมูลถังขยะรหัส "${targetBinId}" ในระบบ`
              );
              continue;
            }

            const lockDevice = await Device.findOne({
              binId: targetBinId,
              type: "SERVO_MOTOR",
              deviceId: /^servo-lock-/i,
            });
            await Command.create({
              binId: targetBinId,
              ...(lockDevice ? { deviceId: lockDevice.deviceId } : {}),
              action: action,
              source: "line",
              status: "pending",
              requestedBy: {
                id: userId,
                email: `line:${userId}`,
                role: "line_user",
              },
            });
            if (lockDevice) {
              lockDevice.pendingCommand = action === "lock" ? "on" : "off";
              await lockDevice.save();
            }

            const isLock = action === "lock";
            const messageText = isLock
              ? `🔒 บันทึกคำสั่ง "ล็อกถังขยะ (${bin.name})"\nลงในคิวเรียบร้อยแล้ว รอ ESP32 ดึงคำสั่ง...`
              : `🔓 บันทึกคำสั่ง "ปลดล็อกถังขยะ (${bin.name})"\nลงในคิวเรียบร้อยแล้ว รอ ESP32 ดึงคำสั่ง...`;

            await replyLineMessage(event.replyToken, messageText);
          }
          // CASE 2: เช็กสถานะถังขยะ
          else if (action === "status") {
            const flexCarousel = await createBinCarouselFlex();
            await replyLineMessage(event.replyToken, [
              flexCarousel as any,
              {
                type: "text",
                text: "เลือกรายการสั่งงานถังขยะได้จากเมนูด้านบนครับ",
                quickReply: getQuickReplyMenu(),
              },
            ]);
          }
          // CASE 3: แจ้งเคลียร์ขยะ
          else if (action === "clear") {
            if (!targetBinId) {
              await replyLineMessage(
                event.replyToken,
                "❌ ไม่พบรหัสถังขยะที่ระบุ"
              );
              continue;
            }

            const bin = await Bin.findOne({ binId: targetBinId });
            if (!bin) {
              await replyLineMessage(
                event.replyToken,
                `❌ ไม่พบข้อมูลถังขยะรหัส "${targetBinId}" ในระบบ`
              );
              continue;
            }

            await Command.create({
              binId: targetBinId,
              action: "clear",
              source: "line",
              status: "pending",
              requestedBy: {
                id: userId,
                email: `line:${userId}`,
                role: "line_user",
              },
            });

            await replyLineMessage(
              event.replyToken,
              `🧹 แจ้งเคลียร์ขยะถัง (${bin.name}) เรียบร้อยแล้ว`
            );
          }
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("LINE Webhook Error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
