"use client";

import { CheckCircle2, AlertTriangle, Bell } from "lucide-react";

interface AlertData {
  _id?: string;
  binId: string;
  binName?: string;
  location?: string;
  type: string;
  level: "warning" | "critical";
  message: string;
}

export default function AlertBanner({ alerts }: { alerts: AlertData[] }) {
  // Case: No Active Alerts
  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center gap-3.5 rounded-xl border border-white/5 bg-[#2C2E3A] px-4 py-4 shadow-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </div>

        <div>
          <p className="font-semibold text-white">All systems normal</p>
          <p className="text-xs text-gray-400">No active alerts</p>
        </div>
      </div>
    );
  }

  const criticalCount = alerts.filter(
    (alert) => alert.level === "critical",
  ).length;

  const hasCritical = criticalCount > 0;

  return (
    <div
      className={`rounded-xl border p-4 shadow-lg ${
        hasCritical
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : "border-amber-500/30 bg-amber-500/10 text-amber-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3.5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            hasCritical
              ? "bg-red-500/20 text-red-400"
              : "bg-amber-500/20 text-amber-400"
          }`}
        >
          {hasCritical ? (
            <AlertTriangle className="h-5 w-5 animate-pulse" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className={`font-semibold ${
                  hasCritical ? "text-red-300" : "text-amber-300"
                }`}
              >
                {alerts.length} Active Alert
                {alerts.length !== 1 ? "s" : ""}
              </p>

              {criticalCount > 0 && (
                <p className="text-xs text-red-300/80">
                  {criticalCount} critical alert
                  {criticalCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          {/* Alert List */}
          <div className="mt-3 space-y-2">
            {alerts.slice(0, 3).map((alert, index) => (
              <div
                key={alert._id || `${alert.binId}-${index}`}
                className="rounded-lg border border-white/5 bg-[#141619]/60 p-3 backdrop-blur-sm"
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-white">
                    {alert.message}
                  </p>

                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      alert.level === "critical"
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {alert.level}
                  </span>
                </div>

                <p className="mt-1 text-xs text-gray-400">
                  Bin:{" "}
                  <span className="font-medium text-gray-300">
                    {alert.binId}
                  </span>
                  {alert.location ? ` • ${alert.location}` : ""}
                </p>
              </div>
            ))}

            {alerts.length > 3 && (
              <p className="pt-1 text-xs font-medium text-gray-400">
                +{alerts.length - 3} more alerts
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
