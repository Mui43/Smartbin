import { Telemetry } from "../models/telemetry.js";
import { Bin } from "../models/bin.js";
import { getMonitoringSettings, type AlertSettings } from "../services/monitoringSettings.js";

export interface BinAlert {
  type:
  | "FULL"
  | "NEAR_FULL"
  | "SENSOR_ERROR"
  | "LOW_BATTERY"
  | "OFFLINE";

  level: "warning" | "critical";

  message: string;
}

export async function checkBinAlerts(
  binId: string,
  alertSettings?: AlertSettings,
): Promise<BinAlert[]> {
  const alerts: BinAlert[] = [];
  const settings = alertSettings ?? await getMonitoringSettings();

  const bin = await Bin.findOne({ binId }).lean();

  if (!bin) {
    return alerts;
  }

  const telemetry = await Telemetry.findOne({
    binId,
    timestamp: { $lte: new Date() },
  })
    .sort({ timestamp: -1 })
    .lean();

  if (!telemetry) {
    if (Date.now() - new Date(bin.createdAt).getTime() > settings.offlineAfterSeconds * 1000) {
      alerts.push({
        type: "OFFLINE",
        level: "critical",
        message: `ไม่พบข้อมูลจากถังเกิน ${settings.offlineAfterSeconds} วินาที`,
      });
    }

    return alerts;
  }

  console.log("🔍 ALERT CHECK:", {
    binId,
    level: telemetry.level,
    thresholdPct: bin.thresholdPct,
    batteryPct: telemetry.batteryPct,
    timestamp: telemetry.timestamp,
  });

  // =========================
  // FULL / NEAR FULL
  // =========================

  if (telemetry.level >= 100) {
    alerts.push({
      type: "FULL",
      level: "critical",
      message: "ถังขยะเต็ม 100%",
    });
  } else if (
    telemetry.level >= bin.thresholdPct
  ) {
    alerts.push({
      type: "NEAR_FULL",
      level: "warning",
      message: `ถังเกือบเต็ม ${telemetry.level}%`,
    });
  }

  // =========================
  // SENSOR ERROR
  // =========================

  const sensors =
    telemetry.sensorStatus;

  if (
    sensors?.capacitive === "error" ||
    sensors?.inductive === "error" ||
    sensors?.level === "error"
  ) {
    alerts.push({
      type: "SENSOR_ERROR",
      level: "critical",
      message: "พบความผิดปกติของ Sensor",
    });
  }

  // =========================
  // LOW BATTERY
  // =========================

  if (typeof telemetry.batteryPct === "number" && Number.isFinite(telemetry.batteryPct) && telemetry.batteryPct <= settings.lowBatteryPct) {
    alerts.push({
      type: "LOW_BATTERY",
      level: "warning",
      message: `แบตเตอรี่ต่ำ ${telemetry.batteryPct}%`,
    });
  }

  // =========================
  // OFFLINE
  // =========================

  const lastSeen =
    new Date(telemetry.timestamp).getTime();

  const now = Date.now();

  const offline =
    now - lastSeen > settings.offlineAfterSeconds * 1000;

  if (offline) {
    alerts.push({
      type: "OFFLINE",
      level: "critical",
      message: `ถังไม่ได้ส่งข้อมูลเกิน ${settings.offlineAfterSeconds} วินาที`,
    });
  }

  return alerts;
}
