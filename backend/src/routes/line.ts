import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { sendLineMessage, replyLineMessage } from "../services/line.js";
import { buildStatusMessage } from "../line/statusMessage.js";
import { Device } from "../models/device.js";
import { Bin } from "../models/bin.js";
import { cancelLineCommand } from "../line/commandResults.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();

export function verifyLineSignature(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const secret = process.env.LINE_CHANNEL_SECRET?.trim();
  const signature = req.header("x-line-signature");
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!secret || !signature || !rawBody)
    return res
      .status(401)
      .json({ error: "Missing LINE signature or raw body" });
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const supplied = Buffer.from(signature, "base64");
  if (
    supplied.length !== expected.length ||
    !crypto.timingSafeEqual(supplied, expected)
  ) {
    return res.status(401).json({ error: "Invalid LINE signature" });
  }
  next();
}

/** Return a supported action from a text or postback event, or null for unrecognized input. */
export function parseLineAction(event: any) {
  const raw =
    event?.type === "postback"
      ? event.postback?.data
      : event?.type === "message" && event.message?.type === "text"
        ? event.message.text
        : "";
  if (event?.type === "postback") {
    const params = new URLSearchParams(String(raw || ""));
    if (
      ["lock_bin", "unlock_bin", "restart_bin"].includes(
        params.get("action") || "",
      ) &&
      params.get("binId")
    )
      return params.get("action");
  }
  const normalized = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^action\s*=\s*/, "");
  if (
    [
      "เริ่มต้นเช็คสถานะ",
      "เช็คสถานะ",
      "ตรวจสอบสถานะ",
      "สถานะ",
      "status",
      "start_status",
    ].includes(normalized)
  )
    return "status";
  if (["on", "off", "clear"].includes(normalized)) return normalized;
  return null;
}

/** Extract the bin ID from postback data, or return null when absent or not a postback. */
function postbackBinId(event: any) {
  if (event?.type !== "postback") return null;
  return new URLSearchParams(String(event.postback?.data || "")).get("binId");
}

/** Return the source group, room, or user ID for result delivery, or null if unavailable. */
function replyDestination(event: any): string | null {
  const source = event?.source;
  if (source?.type === "group") return source.groupId || null;
  if (source?.type === "room") return source.roomId || null;
  return source?.userId || null;
}

async function queueDeviceCommand(
  event: any,
  replyToken: string,
  device: InstanceType<typeof Device> | null,
  action: "lock" | "unlock" | "restart",
  binName: string,
) {
  const verb =
    action === "lock"
      ? "ล็อกถัง"
      : action === "unlock"
        ? "ปลดล็อกถัง"
        : "รีสตาร์ต ESP32";
  if (!device)
    return replyLineMessage(
      replyToken,
      `❌ สั่ง${verb} ${binName} ไม่สำเร็จ: ไม่พบ${action === "restart" ? " ESP32" : " Servo Lock"} ที่ลงทะเบียน`,
    );
  const to = replyDestination(event);
  if (!to)
    return replyLineMessage(
      replyToken,
      `❌ สั่ง${verb} ${binName} ไม่สำเร็จ: ไม่มีปลายทาง LINE สำหรับแจ้งผลหลังอุปกรณ์ตอบกลับ`,
    );
  if (
    device.status !== "online" ||
    !device.lastSeen ||
    Date.now() - new Date(device.lastSeen).getTime() > 60_000
  ) {
    return replyLineMessage(
      replyToken,
      `❌ สั่ง${verb} ${binName} ไม่สำเร็จ: ${action === "restart" ? "ESP32" : "Servo Lock"} ออฟไลน์หรือไม่ได้ส่ง heartbeat ใน 60 วินาที`,
    );
  }
  if (action === "restart" && !device.bootId) {
    return replyLineMessage(
      replyToken,
      `❌ สั่ง${verb} ${binName} ไม่สำเร็จ: ESP32 ยังไม่ส่งรหัสการเริ่มระบบ กรุณาอัปโหลดเฟิร์มแวร์เวอร์ชันใหม่`,
    );
  }
  if (device.pendingCommand || device.lineCommand) {
    return replyLineMessage(
      replyToken,
      `❌ สั่ง${verb} ${binName} ไม่สำเร็จ: อุปกรณ์มีคำสั่งก่อนหน้าค้างอยู่ กรุณารอผลหรือเคลียร์คำสั่ง`,
    );
  }
  const desired =
    action === "lock" ? "on" : action === "unlock" ? "off" : "restart";
  const now = new Date();
  const queued = await Device.findOneAndUpdate(
    {
      _id: device._id,
      pendingCommand: null,
      lineCommand: null,
      status: "online",
      lastSeen: { $gt: new Date(now.getTime() - 60_000) },
    },
    {
      $set: {
        pendingCommand: desired,
        pendingCommandAt: null,
        lineCommand: {
          to,
          action,
          binName,
          requestedAt: now,
          deadlineAt: new Date(
            now.getTime() + (action === "restart" ? 90_000 : 45_000),
          ),
          phase: "queued",
          bootIdAtRequest: action === "restart" ? device.bootId : undefined,
          retryKey: crypto.randomUUID(),
        },
      },
    },
    { new: true },
  );
  if (!queued)
    return replyLineMessage(
      replyToken,
      `❌ สั่ง${verb} ${binName} ไม่สำเร็จ: สถานะอุปกรณ์เปลี่ยนหรือมีคำสั่งอื่นเข้ามาก่อน`,
    );
  return replyLineMessage(
    replyToken,
    `⏳ รับคำสั่ง${verb} ${binName} แล้ว กำลังรอ ESP32 ยืนยันผล จะส่งข้อความแจ้งว่าสำเร็จหรือสาเหตุที่ไม่สำเร็จ`,
  );
}

/** Send a test message to the configured LINE recipient and report delivery success or failure. */
router.post("/test", authenticate, requireRole("admin"), async (_req, res) => {
  try {
    await sendLineMessage(
      "🤖 Smart Bin Test\n\nระบบเชื่อมต่อ LINE สำเร็จแล้ว ✅",
    );
    res.json({ success: true, message: "LINE message sent" });
  } catch (error) {
    console.error("LINE test error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "LINE_SEND_FAILED",
        message: "Unable to send LINE message",
      },
    });
  }
});

/** Process signed LINE events using the configured sender policy and reply with status or command results. */
router.post("/webhook", verifyLineSignature, async (req, res) => {
  try {
    const allowedIds = (process.env.ALLOWED_USER_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const allowAll = allowedIds.length === 0 || allowedIds.includes("*");
    for (const event of req.body?.events || []) {
      const replyToken = event.replyToken;
      if (!replyToken) continue;
      try {
        const userId = event.source?.userId;
        if (!allowAll && (!userId || !allowedIds.includes(userId))) {
          await replyLineMessage(replyToken, "⛔ คุณไม่มีสิทธิ์ใช้งานระบบนี้");
          continue;
        }
        const action = parseLineAction(event);
        if (action === "status") {
          await replyLineMessage(replyToken, await buildStatusMessage());
          continue;
        }
        if (
          action === "lock_bin" ||
          action === "unlock_bin" ||
          action === "restart_bin"
        ) {
          const binId = postbackBinId(event);
          const bin = binId ? await Bin.findOne({ binId }).lean() : null;
          if (!bin) {
            await replyLineMessage(
              replyToken,
              "❌ สั่งงานไม่สำเร็จ: ไม่พบถังขยะนี้ในระบบ",
            );
            continue;
          }
          const command =
            action === "lock_bin"
              ? "lock"
              : action === "unlock_bin"
                ? "unlock"
                : "restart";
          const device =
            command === "restart"
              ? await Device.findOne({ binId: bin.binId, type: "ESP32" })
              : await Device.findOne({
                  binId: bin.binId,
                  type: "SERVO_MOTOR",
                  deviceId: /^servo-lock-/i,
                });
          await queueDeviceCommand(
            event,
            replyToken,
            device,
            command,
            bin.name || bin.binId,
          );
          continue;
        }
        if (action === "on" || action === "off" || action === "clear") {
          const deviceId =
            process.env.LINE_CONTROL_DEVICE_ID?.trim() || "servo-lock-A001";
          const device = await Device.findOne({ deviceId });
          if (!device) {
            await replyLineMessage(
              replyToken,
              `❌ สั่งงานไม่สำเร็จ: ไม่พบอุปกรณ์ ${deviceId} ในระบบ`,
            );
            continue;
          }
          if (action === "clear") {
            if (!device.pendingCommand && !device.lineCommand) {
              await replyLineMessage(replyToken, "✅ ไม่มีคำสั่งค้างอยู่แล้ว");
            } else {
              if (device.lineCommand?.phase === "result") {
                device.lineCommand = null;
                device.pendingCommand = null;
                await device.save();
              } else if (device.lineCommand) await cancelLineCommand(device);
              else {
                device.pendingCommand = null;
                await device.save();
              }
              await replyLineMessage(
                replyToken,
                "✅ เคลียร์คำสั่งที่ค้างอยู่แล้ว",
              );
            }
            continue;
          }
          const bin = await Bin.findOne({ binId: device.binId }).lean();
          await queueDeviceCommand(
            event,
            replyToken,
            device,
            action === "on" ? "lock" : "unlock",
            bin?.name || device.binId,
          );
          continue;
        }
        if (
          event.type === "postback" ||
          (event.type === "message" && event.message?.type === "text")
        ) {
          await replyLineMessage(
            replyToken,
            "❌ ไม่รู้จักคำสั่งนี้ กรุณาเลือกคำสั่งจากการ์ดสถานะหรือเมนู LINE",
          );
        }
      } catch (error) {
        console.error("LINE command failed:", error);
        try {
          await replyLineMessage(
            replyToken,
            "❌ สั่งงานไม่สำเร็จ: ระบบไม่สามารถบันทึกหรือส่งคำสั่งได้ กรุณาลองใหม่อีกครั้ง",
          );
        } catch (replyError) {
          console.error("LINE failure reply failed:", replyError);
        }
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("LINE webhook failed:", error);
    res
      .status(500)
      .json({ success: false, error: { message: "LINE webhook failed" } });
  }
});

export default router;
