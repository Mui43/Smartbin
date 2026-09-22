"use client";

import { Sun } from "lucide-react";

interface TelemetryData {
  batteryPct: number;
  voltage: number;
}

export default function SolarBattery({
  telemetry,
}: {
  telemetry: TelemetryData;
}) {
  const battery = Math.min(Math.max(telemetry.batteryPct, 0), 100);

  const batteryStatus =
    battery <= 20 ? "Low" : battery <= 50 ? "Medium" : "Good";

  const batteryColor =
    battery <= 20
      ? "text-rose-400"
      : battery <= 50
        ? "text-amber-400"
        : "text-emerald-400";

  const batteryBar =
    battery <= 20
      ? "bg-rose-500"
      : battery <= 50
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
            Power
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
            Solar & Battery
          </h2>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14] text-amber-400">
          <Sun size={22} className="shrink-0 animate-spin-slow" />
        </div>
      </div>

      {/* Battery Box */}
      <div className="mt-6 rounded-xl border border-[#212b3d] bg-[#0a0d14] p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">
            Battery Level
          </span>
          <span className={`text-xs font-semibold ${batteryColor}`}>
            {batteryStatus}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <span className={`text-4xl font-bold tracking-tight ${batteryColor}`}>
            {battery}%
          </span>
          <span className="text-xs text-slate-400">Capacity</span>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#131822]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${batteryBar}`}
            style={{ width: `${battery}%` }}
          />
        </div>
      </div>

      {/* Voltage & Power Source */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#212b3d] bg-[#0a0d14] p-4">
          <p className="text-xs font-medium text-slate-400">Voltage</p>
          <p className="mt-2 text-xl font-bold text-white">
            {telemetry.voltage.toFixed(1)}
            <span className="ml-1 text-xs font-normal text-slate-400">V</span>
          </p>
        </div>

        <div className="rounded-xl border border-[#212b3d] bg-[#0a0d14] p-4">
          <p className="text-xs font-medium text-slate-400">Power Source</p>
          <p className="mt-2 text-xl font-bold text-emerald-400">Solar</p>
        </div>
      </div>
    </div>
  );
}
