"use client";

import {
  Wifi,
  WifiOff,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
} from "lucide-react";

import { useTelemetry } from "@/hooks/useTelemetry";
import { useAlerts } from "@/hooks/useAlerts";

import BinOverview from "@/components/dashboard/BinOverview";
import SolarBattery from "@/components/dashboard/SolarBattery";
import LockControl from "@/components/dashboard/LockControl";
import WasteChart from "@/components/charts/WasteChart";
import TelemetryTable from "@/components/dashboard/TelemetryTable";

import AlertBanner from "@/components/ui/AlertBanner";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function Home() {
  // ดึงข้อมูลจริงจาก Backend ผ่าน Custom Hooks
  const { telemetry, connected } = useTelemetry();
  const { alerts } = useAlerts();

  return (
    <main className="min-h-screen bg-[#202A30] text-[#EBF4DD]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="min-h-screen p-4 sm:p-6 lg:ml-64 lg:p-8">
        <Header />

        {/* =========================
            Connection Status Bar (แสดงสถานะตามจริง)
        ========================= */}
        <div className="mb-5 flex items-center justify-between rounded-xl border border-[#5A7863]/40 bg-[#2C3840]/90 px-4 py-3 shadow-lg backdrop-blur-md transition-all duration-300">
          <div className="flex items-center gap-3.5">
            {/* WiFi Icon + Pulse Radar Effect */}
            <div className="relative flex items-center justify-center">
              {connected ? (
                <>
                  <span className="absolute inline-flex h-6 w-6 animate-ping rounded-full bg-emerald-400 opacity-25" />
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
                    <Wifi
                      size={18}
                      className="animate-pulse text-emerald-400"
                    />
                  </div>
                </>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 ring-1 ring-red-500/30">
                  <WifiOff size={18} className="text-red-400" />
                </div>
              )}
            </div>

            {/* Status Label */}
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 text-sm font-semibold tracking-wide">
                <span
                  className={`h-2 w-2 rounded-full ${
                    connected
                      ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : "bg-red-400 shadow-[0_0_8px_#f87171]"
                  }`}
                />
                <span
                  className={connected ? "text-emerald-300" : "text-red-400"}
                >
                  {connected ? "Realtime Connected" : "Disconnected"}
                </span>
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs text-[#90AB8B]/70 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#90AB8B]/40" />
            <span>MQTT / SSE Engine</span>
          </div>
        </div>

        {/* =========================
            Alert (แสดงเมื่อมีข้อมูลจริงส่งมาจาก Backend)
        ========================= */}
        {alerts && alerts.length > 0 && (
          <div className="mb-6">
            <AlertBanner alerts={alerts} />
          </div>
        )}

        {/* =========================
            Waiting State / Main Content
        ========================= */}
        {!telemetry ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-[#5A7863]/40 bg-[#3B4953] p-6 shadow-xl">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#202A30] text-[#90AB8B] shadow-inner">
                <Trash2
                  size={32}
                  className="shrink-0 animate-bounce text-[#90AB8B]"
                />
              </div>

              <p className="font-medium text-[#EBF4DD]">
                Waiting for telemetry...
              </p>

              <p className="mt-2 text-sm text-[#90AB8B]">
                Waiting for data from Smart Bin
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* =========================
                Overview
            ========================= */}
            <section>
              <BinOverview telemetry={telemetry} />
            </section>

            {/* =========================
                Chart
            ========================= */}
            <section className="mt-6">
              <WasteChart />
            </section>

            {/* =========================
                Solar + Lock
            ========================= */}
            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <SolarBattery telemetry={telemetry} />
              <LockControl binId={telemetry.binId} />
            </section>

            {/* =========================
                Sensors
            ========================= */}
            <section className="mt-6 rounded-2xl border border-[#5A7863]/40 bg-[#3B4953] p-5 shadow-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#90AB8B]">
                    Monitoring
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-[#EBF4DD]">
                    Sensor Status
                  </h2>
                </div>

                <Cpu size={20} className="shrink-0 text-[#90AB8B]" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Sensor
                  name="Capacitive"
                  status={telemetry.sensorStatus?.capacitive || "offline"}
                />

                <Sensor
                  name="Inductive"
                  status={telemetry.sensorStatus?.inductive || "offline"}
                />

                <Sensor
                  name="Level"
                  status={telemetry.sensorStatus?.level || "offline"}
                />
              </div>
            </section>

            {/* =========================
                Telemetry Table
            ========================= */}
            <section className="mt-6">
              <TelemetryTable binId={telemetry.binId} />
            </section>
          </>
        )}
      </div>
    </main>
  );
}

/* =========================
   Sensor Component
========================= */

function Sensor({ name, status }: { name: string; status: string }) {
  const isOk = status === "ok";
  const isWarning = status === "warning";
  const isOffline = status === "offline";

  const statusColor = isOk
    ? "text-[#90AB8B]"
    : isWarning
      ? "text-yellow-300"
      : isOffline
        ? "text-gray-400"
        : "text-red-400";

  const statusBackground = isOk
    ? "bg-[#5A7863]/40"
    : isWarning
      ? "bg-yellow-400/10"
      : isOffline
        ? "bg-gray-400/10"
        : "bg-red-400/10";

  return (
    <div className="rounded-xl border border-[#5A7863]/40 bg-[#3B4953] p-4 transition duration-200 hover:border-[#90AB8B]/40 hover:bg-[#5A7863]/30">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#90AB8B]">{name}</p>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${statusBackground} ${statusColor}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        {isOk && <CheckCircle2 size={16} className="shrink-0 text-[#90AB8B]" />}
        {isWarning && (
          <AlertTriangle size={16} className="shrink-0 text-yellow-300" />
        )}
        {isOffline && <WifiOff size={16} className="shrink-0 text-gray-400" />}
        {!isOk && !isWarning && !isOffline && (
          <XCircle size={16} className="shrink-0 text-red-400" />
        )}

        <p className={`font-semibold ${statusColor}`}>
          {isOk
            ? "Operational"
            : isWarning
              ? "Warning"
              : isOffline
                ? "Offline"
                : "Error"}
        </p>
      </div>
    </div>
  );
}
