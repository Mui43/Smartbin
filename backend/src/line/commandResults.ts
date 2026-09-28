import { Device, IDevice, ILineCommand } from "../models/device.js";
import { sendLineMessageTo } from "../services/line.js";

const sending = new Set<string>();

export async function deliverLineResult(device: IDevice) {
  const command = device.lineCommand;
  if (command?.phase !== "result" || !command.resultText || sending.has(device.deviceId) ||
      (command.nextDeliveryAt && new Date(command.nextDeliveryAt).getTime() > Date.now())) return;
  sending.add(device.deviceId);
  try {
    await sendLineMessageTo(command.to, command.resultText, command.retryKey);
    await Device.updateOne(
      { _id: device._id, "lineCommand.phase": "result", "lineCommand.requestedAt": command.requestedAt },
      { $unset: { lineCommand: "" } },
    );
  } catch (error) {
    console.error("LINE command result delivery failed:", error);
    const attempts = command.deliveryAttempts || 0;
    try {
      await Device.updateOne(
        { _id: device._id, "lineCommand.phase": "result", "lineCommand.requestedAt": command.requestedAt },
        { $inc: { "lineCommand.deliveryAttempts": 1 }, $set: { "lineCommand.nextDeliveryAt": new Date(Date.now() + Math.min(60_000 * 2 ** attempts, 900_000)) } },
      );
    } catch (saveError) {
      console.error("LINE command retry scheduling failed:", saveError);
    }
  } finally {
    sending.delete(device.deviceId);
  }
}

export async function confirmServoCommand(device: IDevice, state: "on" | "off") {
  const action = state === "on" ? "lock" : "unlock";
  const verb = state === "on" ? "ล็อก" : "ปลดล็อก";
  const command = device.lineCommand;
  if (command?.action !== action || command.phase !== "queued") return null;
  const updated = await Device.findOneAndUpdate(
    { _id: device._id, pendingCommand: state, "lineCommand.action": action, "lineCommand.phase": "queued", "lineCommand.requestedAt": command.requestedAt },
    { $set: {
      state, status: "online", lastSeen: new Date(), pendingCommand: null,
      "lineCommand.phase": "result",
      "lineCommand.resultText": `✅ ${verb}ถัง ${command.binName} สำเร็จ: ESP32 รายงานสถานะ Servo Lock เป็น ${state === "on" ? "ล็อก" : "ปลดล็อก"}`,
    } },
    { new: true },
  );
  if (updated) void deliverLineResult(updated);
  return updated;
}

export async function confirmRestart(device: IDevice, bootId: string) {
  const command = device.lineCommand;
  if (command?.action !== "restart" || command.phase !== "restarting" || !command.bootIdAtRequest || command.bootIdAtRequest === bootId) return;
  const updated = await Device.findOneAndUpdate(
    { _id: device._id, "lineCommand.action": "restart", "lineCommand.phase": "restarting", "lineCommand.requestedAt": command.requestedAt },
    { $set: {
      "lineCommand.phase": "result",
      "lineCommand.resultText": `✅ รีสตาร์ต ESP32 ของ ${command.binName} สำเร็จ: อุปกรณ์กลับมาออนไลน์หลังเริ่มระบบใหม่`,
    } },
    { new: true },
  );
  if (updated) void deliverLineResult(updated);
}

export async function cancelLineCommand(device: IDevice) {
  const command = device.lineCommand;
  if (!command || command.phase === "result") return;
  const updated = await Device.findOneAndUpdate(
    { _id: device._id, "lineCommand.phase": { $in: ["queued", "restarting"] }, "lineCommand.requestedAt": command.requestedAt },
    { $set: {
      pendingCommand: null,
      "lineCommand.phase": "result",
      "lineCommand.resultText": `⚠️ คำสั่ง${command.action === "lock" ? "ล็อก" : command.action === "unlock" ? "ปลดล็อก" : "รีสตาร์ต"} ${command.binName} ถูกยกเลิกก่อนยืนยันผล`,
    } },
    { new: true },
  );
  if (updated) void deliverLineResult(updated);
}

async function checkPendingLineCommands() {
  const expired = await Device.find({ "lineCommand.phase": { $in: ["queued", "restarting"] }, "lineCommand.deadlineAt": { $lte: new Date() } });
  for (const device of expired) {
    const command = device.lineCommand as ILineCommand;
    const action = command.action === "lock" ? "ล็อก" : command.action === "unlock" ? "ปลดล็อก" : "รีสตาร์ต";
    const reason = command.action === "restart" && command.phase === "restarting"
      ? "ESP32 รับคำสั่งแล้ว แต่ไม่กลับมาออนไลน์พร้อมรหัสการเริ่มระบบใหม่ภายในเวลาที่กำหนด"
      : command.action === "restart"
        ? "ESP32 ไม่ยืนยันว่าได้รับคำสั่งภายในเวลาที่กำหนด"
        : "Servo Lock ไม่รายงานสถานะใหม่ภายในเวลาที่กำหนด";
    const updated = await Device.findOneAndUpdate(
      { _id: device._id, "lineCommand.phase": command.phase, "lineCommand.requestedAt": command.requestedAt, "lineCommand.deadlineAt": { $lte: new Date() } },
      { $set: {
        pendingCommand: null,
        "lineCommand.phase": "result",
        "lineCommand.resultText": `❌ สั่ง${action} ${command.binName} ไม่สำเร็จ: ${reason}`,
      } },
      { new: true },
    );
    if (updated) await deliverLineResult(updated);
  }
  const undelivered = await Device.find({ "lineCommand.phase": "result" });
  for (const device of undelivered) await deliverLineResult(device);
}

export function startLineCommandChecker() {
  const timer = setInterval(() => {
    checkPendingLineCommands().catch(error => console.error("LINE command checker failed:", error));
  }, 5_000);
  timer.unref();
}
