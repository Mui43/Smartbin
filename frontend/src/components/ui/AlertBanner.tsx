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
  if (!alerts || alerts.length === 0) {
    return (
      <div
        className="
          flex
          items-center
          gap-3
          rounded-2xl
          border
          border-[#235347]/40
          bg-[#163831]
          px-4
          py-4
          shadow-lg
        "
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#235347]">
          <CheckCircle2 size={20} className="text-[#DAF1DE] shrink-0" />
        </div>

        <div>
          <p className="font-semibold text-[#DAF1DE]">All systems normal</p>

          <p className="text-sm text-[#8EB69B]">No active alerts</p>
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
      className={`
        rounded-2xl
        border
        p-4
        shadow-lg
        ${
          hasCritical
            ? "border-red-400/30 bg-red-400/10"
            : "border-yellow-300/30 bg-yellow-300/10"
        }
      `}
    >
      {/* Header */}

      <div className="flex items-start gap-3">
        <div
          className={`
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${hasCritical ? "bg-red-400/20" : "bg-yellow-300/20"}
          `}
        >
          {hasCritical ? (
            <AlertTriangle size={20} className="text-red-300 shrink-0" />
          ) : (
            <Bell size={20} className="text-yellow-200 shrink-0" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className={`
                  font-semibold
                  ${hasCritical ? "text-red-300" : "text-yellow-200"}
                `}
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

          {/* Alert list */}

          <div className="mt-3 space-y-2">
            {alerts.slice(0, 3).map((alert, index) => (
              <div
                key={alert._id || `${alert.binId}-${index}`}
                className="
                  rounded-xl
                  border
                  border-white/5
                  bg-black/10
                  p-3
                "
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-[#DAF1DE]">{alert.message}</p>

                  <span
                    className={`
                      w-fit
                      rounded-full
                      px-2
                      py-1
                      text-[10px]
                      font-semibold
                      uppercase
                      ${
                        alert.level === "critical"
                          ? "bg-red-400/10 text-red-300"
                          : "bg-yellow-300/10 text-yellow-200"
                      }
                    `}
                  >
                    {alert.level}
                  </span>
                </div>

                <p className="mt-1 text-xs text-[#8EB69B]">
                  Bin: {alert.binId}
                  {alert.location ? ` • ${alert.location}` : ""}
                </p>
              </div>
            ))}

            {alerts.length > 3 && (
              <p className="pt-1 text-xs text-[#8EB69B]">
                +{alerts.length - 3} more alerts
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
