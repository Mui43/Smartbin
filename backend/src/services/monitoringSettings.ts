import { MonitoringSettings } from "../models/monitoringSettings.js";

export type AlertSettings = {
  offlineAfterSeconds: number;
  lowBatteryPct: number;
  reminderIntervalMinutes: number;
};

export const defaultAlertSettings: AlertSettings = {
  offlineAfterSeconds: 60,
  lowBatteryPct: 20,
  reminderIntervalMinutes: 0,
};

export async function getMonitoringSettings() {
  const saved = await MonitoringSettings.findOne({ key: "main" }).lean();
  return {
    ...defaultAlertSettings,
    offlineAfterSeconds: saved?.offlineAfterSeconds ?? defaultAlertSettings.offlineAfterSeconds,
    lowBatteryPct: saved?.lowBatteryPct ?? defaultAlertSettings.lowBatteryPct,
    reminderIntervalMinutes: saved?.reminderIntervalMinutes ?? defaultAlertSettings.reminderIntervalMinutes,
    lineTargetId: saved?.lineTargetId ?? process.env.LINE_TARGET_USER_ID?.trim() ?? "",
    lineLastTestAt: saved?.lineLastTestAt ?? null,
    lineLastTestStatus: saved?.lineLastTestStatus ?? null,
    lineLastTestError: saved?.lineLastTestError ?? null,
  };
}
