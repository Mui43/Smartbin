import { Bin } from "../models/bin.js";
import { Device } from "../models/device.js";
import { Telemetry } from "../models/telemetry.js";
import { LineMessage } from "../services/line.js";

/** Create a wrapping LINE Flex text component with optional color and size. */
const label = (text: string, color = "#D6E5DC", size = "sm") => ({ type: "text", text, color, size, wrap: true });
/** Create a LINE Flex button whose postback encodes an action and bin ID. */
const actionButton = (text: string, action: string, binId: string, color: string) => ({
  type: "button", style: "primary", height: "sm", color,
  action: { type: "postback", label: text, data: new URLSearchParams({ action, binId }).toString() },
});

/**
 * Build status cards for up to ten bins sorted by name, with telemetry,
 * device connectivity, lock state, and control buttons.
 * Return a text message when no bins exist.
 */
export async function buildStatusMessage(): Promise<LineMessage> {
  const bins = await Bin.find().sort({ name: 1 }).limit(10).lean();
  if (!bins.length) return { type: "text", text: "ยังไม่มีถังขยะในระบบ" };

  const bubbles = await Promise.all(bins.map(async bin => {
    const [telemetry, devices] = await Promise.all([
      Telemetry.findOne({ binId: bin.binId, timestamp: { $lte: new Date() } }).sort({ timestamp: -1 }).lean(),
      Device.find({ binId: bin.binId }).select("deviceId type status state pendingCommand lastSeen").lean(),
    ]);
    const online = devices.filter(device => device.status === "online" && device.lastSeen && Date.now() - new Date(device.lastSeen).getTime() < 60_000).length;
    const percent = typeof telemetry?.level === "number" && Number.isFinite(telemetry.level)
      ? Math.max(0, Math.min(100, Math.round(telemetry.level))) : null;
    const level = percent === null ? "ยังไม่มีข้อมูล" : `${percent}%`;
    const fullness = percent === null ? "ยังไม่มีข้อมูล" : percent >= 100 ? "เต็ม" : percent >= bin.thresholdPct ? "ใกล้เต็ม" : "ปกติ";
    const fillColor = percent === null ? "#87998F" : percent >= 100 ? "#EF4444" : percent >= bin.thresholdPct ? "#FBBF24" : "#10B981";
    const fillGradient = percent === null
      ? { startColor: "#9CA3AF", endColor: "#87998F" }
      : percent >= 100
        ? { startColor: "#FB7185", endColor: "#EF4444" }
        : percent >= bin.thresholdPct
          ? { startColor: "#FDE047", endColor: "#F59E0B" }
          : { startColor: "#34D399", endColor: "#10B981" };
    const lock = devices.find(device => device.type === "SERVO_MOTOR" && /^servo-lock-/i.test(device.deviceId));
    const lockStatus = lock?.pendingCommand ? "⏳ รออุปกรณ์ยืนยัน" : lock?.state === "on" ? "🔒 ล็อกอยู่" : lock?.state === "off" ? "🔓 ปลดล็อกอยู่" : "❔ ยังไม่ทราบ";
    const measured = telemetry?.timestamp
      ? new Date(telemetry.timestamp).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })
      : "—";
    return {
      type: "bubble",
      size: "mega",
      header: { type: "box", layout: "vertical", backgroundColor: "#090D17", spacing: "sm", contents: [
        { type: "box", layout: "horizontal", contents: [
          { ...label(bin.name || bin.binId, "#FFFFFF", "xl"), weight: "bold", flex: 1 },
          { ...label(fullness, fillColor, "sm"), align: "end", flex: 0 },
        ] },
        label(`📍 ${bin.location || "ไม่ระบุสถานที่"}`, "#949BA9", "sm"),
      ] },
      body: { type: "box", layout: "vertical", backgroundColor: "#131A2B", spacing: "lg", contents: [
        { type: "box", layout: "horizontal", alignItems: "center", contents: [
          { ...label("ปริมาณขยะ", "#949BA9", "sm"), flex: 1 },
          { ...label(level, fillColor, "xxl"), align: "end", flex: 0, weight: "bold" },
        ] },
        { type: "box", layout: "vertical", backgroundColor: "#D1D5DB", cornerRadius: "md", height: "8px", contents: [
          { type: "box", layout: "vertical", width: `${Math.max(percent ?? 0, 1)}%`, height: "8px", flex: 0,
            backgroundColor: fillColor,
            background: { type: "linearGradient", angle: "90deg", ...fillGradient }, contents: [] },
        ] },
        { type: "separator", color: "#293347" },
        { type: "box", layout: "horizontal", contents: [
          { ...label("สถานะกลอน", "#949BA9", "sm"), flex: 1 },
          { ...label(lockStatus, "#FBBF24", "sm"), align: "end", flex: 0 },
        ] },
        label(`ออนไลน์ ${online}/${devices.length} • ล่าสุด ${measured}`, "#949BA9", "xs"),
      ] },
      footer: { type: "box", layout: "vertical", backgroundColor: "#131A2B", spacing: "sm", contents: [
        actionButton("สั่งล็อกถัง", "lock_bin", bin.binId, "#EF4444"),
        actionButton("สั่งปลดล็อกถัง", "unlock_bin", bin.binId, "#10B981"),
        actionButton("รีสตาร์ต ESP32", "restart_bin", bin.binId, "#BFC2C7"),
      ] },
    };
  }));

  return {
    type: "flex",
    altText: `สถานะ Smart Bin ${bins.map(bin => bin.name || bin.binId).join(", ")}`,
    contents: bubbles.length === 1 ? bubbles[0] : { type: "carousel", contents: bubbles },
  };
}
