import { Bin } from "../models/bin.js";
import { Telemetry } from "../models/telemetry.js";
import { Device } from "../models/device.js";

/**
 * Theme tokens — สอดคล้องกับ global.css ของแอป
 * (LINE Flex ไม่รองรับ rgba ต้องใช้ hex ทึบเท่านั้น)
 */
const theme = {
  bg: "#0B0F1A",
  card: "#131A2A",
  cardRaised: "#C0C0C0",
  border: "#1F2937",
  text: "#FFFFFF",
  textSecondary: "#8B93A8",
  textMuted: "#6B7280",

  accent: "#10B981",
  accentHover: "#0EA371",
  accentBg: "#0F2A22", // accent tint บนพื้นเข้ม

  warning: "#F5B120",
  warningBg: "#3A2E12",

  danger: "#EF4444",
  dangerBg: "#3A1A1A",
};

/**
 * สร้าง Flex Message Carousel แสดงรายการถังขยะทั้งหมด
 */
export async function createBinCarouselFlex() {
  const bins = await Bin.find().sort({ name: 1 }).lean();

  if (bins.length === 0) {
    return {
      type: "text",
      text: "⚠️ ไม่พบข้อมูลถังขยะในระบบ",
    };
  }

  const contents = await Promise.all(
    bins.map(async (bin) => {
      const latestTelemetry = await Telemetry.findOne({ binId: bin.binId })
        .sort({ timestamp: -1 })
        .lean();

      const servoDevice = await Device.findOne({
        binId: bin.binId,
        type: "SERVO_MOTOR",
      }).lean();

      const rawFillLevel = latestTelemetry?.level ?? 0;
      const fillLevel = Math.min(Math.max(rawFillLevel, 0), 100);
      const isLocked = servoDevice?.state === "on";

      // การกำหนดสีและสถานะ — ใกล้/เกิน threshold ใช้ warning/danger
      // แทนการสลับ accent/danger ตรงๆ เพื่อให้มี step เตือนก่อนเต็มจริง
      const nearFull =
        fillLevel >= bin.thresholdPct * 0.8 && fillLevel < bin.thresholdPct;
      const isFull = fillLevel >= bin.thresholdPct;

      const statusColor = isFull
        ? theme.danger
        : nearFull
          ? theme.warning
          : theme.accent;
      const statusText = isFull ? "เต็มแล้ว" : nearFull ? "ใกล้เต็ม" : "ปกติ";

      const lockTextColor = isLocked ? theme.accent : theme.warning;
      const lockStatusText = isLocked ? "🔒 ล็อกอยู่" : "🔓 ปลดล็อกอยู่";

      return {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: theme.bg,
          paddingAll: "lg",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: bin.name,
                  weight: "bold",
                  size: "lg",
                  color: theme.text,
                  flex: 1,
                },
                {
                  type: "text",
                  text: statusText,
                  size: "sm",
                  color: statusColor,
                  weight: "bold",
                  align: "end",
                  gravity: "center",
                },
              ],
            },
            {
              type: "text",
              text: `📍 ${bin.location}`,
              size: "xs",
              color: theme.textMuted,
              margin: "sm",
            },
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          backgroundColor: theme.card,
          paddingAll: "lg",
          contents: [
            // --- Section 1: ระดับขยะ + Visual Progress Bar ---
            {
              type: "box",
              layout: "horizontal",
              alignItems: "center",
              contents: [
                {
                  type: "text",
                  text: "ปริมาณขยะ",
                  size: "sm",
                  color: theme.textSecondary,
                  weight: "bold",
                },
                {
                  type: "text",
                  text: `${fillLevel}%`,
                  size: "xl",
                  weight: "bold",
                  color: statusColor,
                  align: "end",
                },
              ],
            },
            // Outer Progress Bar
            {
              type: "box",
              layout: "vertical",
              backgroundColor: theme.cardRaised,
              height: "8px",
              cornerRadius: "xxl",
              margin: "md",
              contents: [
                // Inner Progress Fill
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: statusColor,
                  width: `${fillLevel}%`,
                  height: "100%",
                  cornerRadius: "xxl",
                  contents: [],
                },
              ],
            },

            {
              type: "separator",
              margin: "xl",
              color: theme.border,
            },

            // --- Section 2: สถานะระบบกลอนล็อก ---
            {
              type: "box",
              layout: "horizontal",
              margin: "xl",
              alignItems: "center",
              contents: [
                {
                  type: "text",
                  text: "สถานะกลอน",
                  size: "sm",
                  color: theme.textSecondary,
                  weight: "bold",
                },
                {
                  type: "text",
                  text: lockStatusText,
                  size: "sm",
                  color: lockTextColor,
                  weight: "bold",
                  align: "end",
                  gravity: "center",
                },
              ],
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          backgroundColor: theme.card,
          spacing: "sm",
          paddingAll: "lg",
          paddingTop: "none",
          contents: [
            {
              type: "button",
              style: "primary",
              color: isLocked ? theme.accent : theme.danger,
              height: "sm",
              action: {
                type: "postback",
                label: isLocked ? "ปลดล็อกถัง" : "สั่งล็อกถัง",
                data: `action=${isLocked ? "unlock" : "lock"}&binId=${bin.binId}`,
              },
            },
            {
              type: "button",
              style: "secondary",
              color: theme.cardRaised,
              height: "sm",
              action: {
                type: "postback",
                label: "🧹 เคลียร์ขยะในถัง",
                data: `action=clear&binId=${bin.binId}`,
              },
            },
          ],
        },
      };
    }),
  );

  return {
    type: "flex",
    altText: "รายการถังขยะและสถานะล่าสุด",
    contents: {
      type: "carousel",
      contents,
    },
  };
}

/**
 * สร้าง Quick Reply ปุ่มทางลัด
 */
export function getQuickReplyMenu() {
  return {
    items: [
      {
        type: "action",
        action: {
          type: "message",
          label: "🗑️ สถานะถังขยะ",
          text: "สถานะถังขยะ",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "❓ ช่วยเหลือ",
          text: "ช่วยเหลือ",
        },
      },
    ],
  };
}
