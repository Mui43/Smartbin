"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Wifi,
  WifiOff,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
} from "lucide-react";

import { useTelemetry, type TelemetryData } from "@/hooks/useTelemetry";
import { useAlerts } from "@/hooks/useAlerts";

import BinOverview from "@/components/dashboard/BinOverview";
import SolarBattery from "@/components/dashboard/SolarBattery";
import LockControl from "@/components/dashboard/LockControl";
import WasteChart from "@/components/charts/WasteChart";
import TelemetryTable from "@/components/dashboard/TelemetryTable";

import AlertBanner from "@/components/ui/AlertBanner";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface DashboardBin {
  binId: string;
  name: string;
  location: string;
  level: number | null;
  batteryPct: number | null;
  voltage: number | null;
  sensorStatus: TelemetryData["sensorStatus"] | null;
  lastSeen: string | null;
}

export default function Home() {
  const { data: session } = useSession();
  const { telemetryByBin, connected } = useTelemetry();
  const { alerts } = useAlerts();
  const [bins, setBins] = useState<DashboardBin[]>([]);
  const [selectedBinId, setSelectedBinId] = useState<string | null>(null);
  const [binsLoading, setBinsLoading] = useState(true);
  const [binsError, setBinsError] = useState("");

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;

    const controller = new AbortController();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    async function loadBins() {
      try {
        setBinsLoading(true);
        const response = await fetch(`${apiUrl}/api/bins`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.data)) {
          throw new Error(result?.error?.message || "ไม่สามารถโหลดรายการถังได้");
        }
        setBins(result.data);
        setBinsError("");
      } catch (error) {
        if (controller.signal.aborted) return;
        setBinsError(error instanceof Error ? error.message : "ไม่สามารถโหลดรายการถังได้");
      } finally {
        if (!controller.signal.aborted) setBinsLoading(false);
      }
    }

    loadBins();
    return () => controller.abort();
  }, [session?.user?.accessToken]);

  const activeBinId = bins.some((bin) => bin.binId === selectedBinId)
    ? selectedBinId
    : bins[0]?.binId;
  const activeBin = bins.find((bin) => bin.binId === activeBinId);
  const telemetry = activeBinId ? telemetryByBin[activeBinId] : undefined;
  const snapshot: TelemetryData | null = activeBin?.lastSeen
    ? {
        binId: activeBin.binId,
        level: activeBin.level ?? 0,
        batteryPct: activeBin.batteryPct ?? 0,
        voltage: activeBin.voltage ?? 0,
        sensorStatus: activeBin.sensorStatus ?? {
          capacitive: "offline",
          inductive: "offline",
          level: "offline",
        },
        timestamp: activeBin.lastSeen,
      }
    : null;
  const activeTelemetry = telemetry ?? snapshot;
  const activeAlerts = alerts.filter((alert) => alert.binId === activeBinId);

  return (
    <main className="min-h-screen bg-[#0a0d14] text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="min-h-screen p-4 sm:p-6 lg:ml-64 lg:p-8">
        <Header />

        {/* =========================
            Connection Status Bar
        ========================= */}
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-[#212b3d] bg-[#131822] px-4 py-3 shadow-xl backdrop-blur-md transition-all duration-300">
          <div className="flex items-center gap-3.5">
            {/* WiFi Icon + Pulse Effect */}
            <div className="relative flex items-center justify-center">
              {connected ? (
                <>
                  <span className="absolute inline-flex h-6 w-6 animate-ping rounded-full bg-emerald-500 opacity-20" />
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
                    <Wifi
                      size={18}
                      className="animate-pulse text-emerald-400"
                    />
                  </div>
                </>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30">
                  <WifiOff size={18} className="text-rose-400" />
                </div>
              )}
            </div>

            {/* Status Label */}
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-2 text-sm font-semibold tracking-wide">
                <span
                  className={`h-2 w-2 rounded-full ${
                    connected
                      ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_#10b981]"
                      : "bg-rose-400 shadow-[0_0_8px_#f43f5e]"
                  }`}
                />
                <span
                  className={connected ? "text-emerald-400" : "text-rose-400"}
                >
                  {connected ? "Realtime Connected" : "Disconnected"}
                </span>
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
            <span>MQTT / SSE Engine</span>
          </div>
        </div>

        <section className="mb-6" aria-label="เลือกถังขยะ">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-white">เลือกถังขยะ</h2>
            <p className="text-sm text-slate-400">เลือกถังเพื่อดูข้อมูลของถังนั้น</p>
          </div>
          {binsError && <p className="mb-3 text-sm text-rose-400">{binsError}</p>}
          {binsLoading ? (
            <p className="text-sm text-slate-400">กำลังโหลดรายการถัง...</p>
          ) : bins.length === 0 ? (
            <p className="rounded-xl border border-[#212b3d] bg-[#131822] p-5 text-sm text-slate-400">
              ยังไม่มีถังขยะในระบบ
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {bins.map((bin) => {
                const latest = telemetryByBin[bin.binId];
                const level = latest?.level ?? bin.level;
                const selected = bin.binId === activeBinId;
                return (
                  <button
                    key={bin.binId}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedBinId(bin.binId)}
                    className={`rounded-2xl border p-4 text-left transition hover:border-emerald-500/60 ${
                      selected
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-[#212b3d] bg-[#131822]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{bin.name}</p>
                        <p className="mt-1 text-xs text-slate-400">{bin.binId}</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-400">
                        {level == null ? "ไม่มีข้อมูล" : `${level}%`}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">{bin.location}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================
            Alert Banner
        ========================= */}
        {activeAlerts.length > 0 && (
          <div className="mb-6">
            <AlertBanner alerts={activeAlerts} />
          </div>
        )}

        {/* =========================
            Waiting State / Main Content
        ========================= */}
        {!activeBinId ? null : (
          <>
        {!activeTelemetry ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-[#212b3d] bg-[#131822] p-6 shadow-2xl">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#212b3d] bg-[#0a0d14] text-emerald-400 shadow-inner">
                <Trash2
                  size={32}
                  className="shrink-0 animate-bounce text-emerald-400"
                />
              </div>

              <p className="font-semibold text-white">
                Waiting for telemetry...
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Waiting for data from {activeBin?.name || activeBinId}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview */}
            <section>
              <BinOverview telemetry={activeTelemetry} />
            </section>
          </>
        )}

            {/* Waste Chart */}
            <section className="mt-6">
              <WasteChart key={activeBinId} binId={activeBinId} />
            </section>

            {/* Solar + Lock Control */}
            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              {activeTelemetry && <SolarBattery telemetry={activeTelemetry} />}
              <LockControl key={activeBinId} binId={activeBinId} />
            </section>

            {/* Sensor Status */}
            {activeTelemetry && (
            <section className="mt-6 rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                    Monitoring
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-white">
                    Sensor Status
                  </h2>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14] text-slate-400">
                  <Cpu size={20} className="shrink-0" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Sensor
                  name="Capacitive"
                  status={activeTelemetry.sensorStatus?.capacitive || "offline"}
                />

                <Sensor
                  name="Inductive"
                  status={activeTelemetry.sensorStatus?.inductive || "offline"}
                />

                <Sensor
                  name="Level"
                  status={activeTelemetry.sensorStatus?.level || "offline"}
                />
              </div>
            </section>
            )}

            {/* Telemetry Table */}
            <section className="mt-6">
              <TelemetryTable key={activeBinId} binId={activeBinId} />
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
    ? "text-emerald-400"
    : isWarning
      ? "text-amber-400"
      : isOffline
        ? "text-slate-400"
        : "text-rose-400";

  const statusBackground = isOk
    ? "bg-emerald-500/10 border-emerald-500/20"
    : isWarning
      ? "bg-amber-500/10 border-amber-500/20"
      : isOffline
        ? "bg-[#0a0d14] border-[#212b3d]"
        : "bg-rose-500/10 border-rose-500/20";

  return (
    <div className="rounded-xl border border-[#212b3d] bg-[#0a0d14] p-4 transition duration-200 hover:border-slate-700">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-300">{name}</p>

        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusBackground} ${statusColor}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        {isOk && <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />}
        {isWarning && (
          <AlertTriangle size={16} className="shrink-0 text-amber-400" />
        )}
        {isOffline && <WifiOff size={16} className="shrink-0 text-slate-500" />}
        {!isOk && !isWarning && !isOffline && (
          <XCircle size={16} className="shrink-0 text-rose-400" />
        )}

        <p className={`font-semibold text-sm ${statusColor}`}>
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
