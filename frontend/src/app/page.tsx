"use client";

import { useTelemetry } from "@/hooks/useTelemetry";
import { useAlerts } from "@/hooks/useAlerts";
import {
  Cpu,
  Zap,
  Gauge,
  Wifi,
  WifiOff,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio,
} from "lucide-react";

import BinOverview from "@/components/dashboard/BinOverview";
import SolarBattery from "@/components/dashboard/SolarBattery";
import LockControl from "@/components/dashboard/LockControl";
import WasteChart from "@/components/charts/WasteChart";
import TelemetryTable from "@/components/dashboard/TelemetryTable";

import AlertBanner from "@/components/ui/AlertBanner";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function Home() {
  const { telemetry: rawTelemetry, connected } = useTelemetry();
  const { alerts } = useAlerts();

  // Mock Data แบบมี Field ครบถ้วนตาม Type TelemetryData
  const mockTelemetry = {
    binId: "A-001",
    level: 45,
    voltage: 12.5,
    batteryPct: 85,
    timestamp: new Date().toISOString(),
    sensorStatus: {
      capacitive: "ok",
      inductive: "ok",
      level: "ok",
    },
  };

  const telemetry = rawTelemetry || mockTelemetry;

  return (
    <main className="min-h-screen bg-[#141619] text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="min-h-screen p-4 sm:p-6 lg:ml-64 lg:p-8">
        <Header />

        {/* =========================
            Connection Status
        ========================= */}
        <div className="mb-5 flex items-center justify-between rounded-xl bg-[#2C2E3A] px-4 py-3 border border-white/5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              {connected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  connected ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </span>

            <div className="flex items-center gap-2">
              {connected ? (
                <Wifi className="h-4 w-4 text-emerald-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-400" />
              )}
              <span
                className={`text-sm font-medium ${
                  connected ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {connected ? "Realtime Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-1.5 text-xs text-gray-400 sm:flex">
            <Radio className="h-3.5 w-3.5 text-gray-400" />
            <span>MQTT / SSE</span>
          </div>
        </div>

        {/* =========================
            Alert
        ========================= */}
        <div className="mb-6">
          <AlertBanner alerts={alerts} />
        </div>

        {/* =========================
            Content Display
        ========================= */}
        {!telemetry ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Overview */}
            <section>
              <BinOverview telemetry={telemetry} />
            </section>

            {/* Chart */}
            <section className="mt-6">
              <WasteChart />
            </section>

            {/* Solar + Lock */}
            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <SolarBattery telemetry={telemetry} />
              <LockControl binId={telemetry.binId} />
            </section>

            {/* Sensors Status */}
            <section className="mt-6 rounded-xl bg-[#2C2E3A] p-5 shadow-lg border border-white/5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Monitoring
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-400" />
                    Sensor Status
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Sensor
                  name="Capacitive"
                  status={telemetry.sensorStatus?.capacitive || "ok"}
                  icon={Cpu}
                />

                <Sensor
                  name="Inductive"
                  status={telemetry.sensorStatus?.inductive || "ok"}
                  icon={Zap}
                />

                <Sensor
                  name="Level"
                  status={telemetry.sensorStatus?.level || "ok"}
                  icon={Gauge}
                />
              </div>
            </section>

            {/* Telemetry Table */}
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
    Dashboard Skeleton Component
========================= */

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. Overview Cards Skeleton (4 Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-[#2C2E3A] p-5 border border-white/5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-white/10" />
              <div className="h-8 w-8 rounded-lg bg-white/10" />
            </div>
            <div className="space-y-2">
              <div className="h-7 w-20 rounded bg-white/10" />
              <div className="h-3 w-32 rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      {/* 2. Chart Section Skeleton */}
      <div className="h-80 rounded-xl bg-[#2C2E3A] p-6 border border-white/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-white/10" />
            <div className="h-3 w-24 rounded bg-white/10" />
          </div>
          <div className="h-8 w-28 rounded-lg bg-white/10" />
        </div>
        {/* Placeholder Bars */}
        <div className="flex h-48 items-end gap-3 pt-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-white/10"
              style={{ height: `${(i % 5) * 18 + 20}%` }}
            />
          ))}
        </div>
      </div>

      {/* 3. Solar & Lock Section Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-[#2C2E3A] p-6 border border-white/5 flex flex-col justify-between">
          <div className="h-6 w-40 rounded bg-white/10" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-white/10" />
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="h-4 w-1/2 rounded bg-white/10" />
          </div>
          <div className="h-10 w-full rounded-lg bg-white/10" />
        </div>

        <div className="h-64 rounded-xl bg-[#2C2E3A] p-6 border border-white/5 flex flex-col justify-between">
          <div className="h-6 w-32 rounded bg-white/10" />
          <div className="flex justify-center py-4">
            <div className="h-16 w-16 rounded-full bg-white/10" />
          </div>
          <div className="h-10 w-full rounded-lg bg-white/10" />
        </div>
      </div>

      {/* 4. Sensor Status Skeleton */}
      <div className="rounded-xl bg-[#2C2E3A] p-6 border border-white/5">
        <div className="mb-5 space-y-2">
          <div className="h-3 w-20 rounded bg-white/10" />
          <div className="h-6 w-36 rounded bg-white/10" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-[#141619] p-4 border border-white/5 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 rounded bg-white/10" />
                <div className="h-4 w-12 rounded-full bg-white/10" />
              </div>
              <div className="h-4 w-28 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================
    Sensor Component (Lucide Theme)
========================= */

function Sensor({
  name,
  status,
  icon: Icon,
}: {
  name: string;
  status: string;
  icon: React.ElementType;
}) {
  const isOk = status === "ok";
  const isWarning = status === "warning";
  const isOffline = status === "offline";

  const statusColor = isOk
    ? "text-emerald-400"
    : isWarning
      ? "text-amber-400"
      : isOffline
        ? "text-gray-400"
        : "text-rose-400";

  const statusBackground = isOk
    ? "bg-emerald-500/10"
    : isWarning
      ? "bg-amber-500/10"
      : isOffline
        ? "bg-gray-500/10"
        : "bg-rose-500/10";

  // Lucide Status Icons
  const StatusIcon = isOk
    ? CheckCircle2
    : isWarning
      ? AlertTriangle
      : isOffline
        ? Radio
        : XCircle;

  return (
    <div className="rounded-lg bg-[#141619] p-4 border border-white/5 transition duration-200 hover:border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-400" />
          <p className="text-sm font-medium text-gray-300">{name}</p>
        </div>

        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusBackground} ${statusColor}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <StatusIcon className={`h-4 w-4 ${statusColor}`} />
        <p className={`text-sm font-semibold ${statusColor}`}>
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
