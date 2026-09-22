"use client";

import { Trash2, Battery, Zap, Activity } from "lucide-react";

interface TelemetryData {
  binId: string;
  level: number;
  sensorStatus: {
    capacitive: string;
    inductive: string;
    level: string;
  };
  voltage: number;
  batteryPct: number;
  timestamp: string;
}

export default function BinOverview({
  telemetry,
}: {
  telemetry: TelemetryData;
}) {
  const level = Math.min(Math.max(telemetry.level, 0), 100);

  const levelStatus =
    level >= 90 ? "Full" : level >= 75 ? "Nearly Full" : "Normal";

  const levelColor =
    level >= 90
      ? "text-rose-400"
      : level >= 75
        ? "text-amber-400"
        : "text-emerald-400";

  const progressColor =
    level >= 90
      ? "bg-rose-500"
      : level >= 75
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <section>
      {/* Header */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
          Overview
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
          {telemetry.binId}
        </h2>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Waste Level */}
        <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl transition duration-200 hover:border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Waste Level</p>
              <p className={`mt-2 text-3xl font-bold ${levelColor}`}>
                {level}%
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14] text-emerald-400">
              <Trash2 size={22} className="shrink-0" />
            </div>
          </div>

          {/* Progress */}
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-slate-400">Capacity</span>
              <span className={`font-semibold ${levelColor}`}>
                {levelStatus}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#0a0d14]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${level}%` }}
              />
            </div>
          </div>
        </div>

        {/* Battery */}
        <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl transition duration-200 hover:border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Battery</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {telemetry.batteryPct}%
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14] text-emerald-400">
              <Battery size={22} className="shrink-0" />
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-[#0a0d14]">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${Math.min(Math.max(telemetry.batteryPct, 0), 100)}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">Solar power system</p>
          </div>
        </div>

        {/* Voltage */}
        <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl transition duration-200 hover:border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Voltage</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {telemetry.voltage.toFixed(1)}
                <span className="ml-1 text-base font-normal text-slate-400">
                  V
                </span>
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14] text-emerald-400">
              <Zap size={22} className="shrink-0" />
            </div>
          </div>

          <p className="mt-5 text-xs text-slate-400">Current battery voltage</p>
        </div>

        {/* Bin Status */}
        <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl transition duration-200 hover:border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">
                System Status
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-400">Online</p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <Activity size={22} className="animate-pulse shrink-0" />
            </div>
          </div>

          <p className="mt-5 text-xs text-slate-400">Last update</p>
          <p className="mt-1 truncate text-xs font-mono text-slate-300">
            {formatDate(telemetry.timestamp)}
          </p>
        </div>
      </div>
    </section>
  );
}

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}
