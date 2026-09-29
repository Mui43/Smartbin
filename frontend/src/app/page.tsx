"use client";
import { apiFetch } from "@/lib/apiFetch";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Wifi,
  WifiOff,
  Trash2,
  Plus,
  Pencil,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";

import { useTelemetry, type TelemetryData } from "@/hooks/useTelemetry";
import { useAlerts } from "@/hooks/useAlerts";

import BinOverview from "@/components/dashboard/BinOverview";
import SolarBattery from "@/components/dashboard/SolarBattery";
import LockControl from "@/components/dashboard/LockControl";
import WasteChart from "@/components/charts/WasteChart";
import TelemetryTable from "@/components/dashboard/TelemetryTable";
import SensorStatus from "@/components/dashboard/SensorStatus";

import AlertBanner from "@/components/ui/AlertBanner";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import AddBinForm from "@/components/dashboard/AddBinForm";
import EditBinForm from "@/components/dashboard/EditBinForm";

interface DashboardBin {
  binId: string;
  name: string;
  location: string;
  thresholdPct: number;
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
  const [showAddBin, setShowAddBin] = useState(false);
  const [editingBinId, setEditingBinId] = useState<string | null>(null);
  const [deletingBinId, setDeletingBinId] = useState<string | null>(null);
  const [binNotice, setBinNotice] = useState("");

  async function deleteBin(bin: DashboardBin) {
    const token = session?.user?.accessToken;
    if (!token || deletingBinId) return;
    const confirmation = await Swal.fire({
      title: `ลบถัง ${bin.name}?`,
      text: `ถัง ${bin.binId} จะถูกนำออกจาก Dashboard ข้อมูลอุปกรณ์และประวัติเดิมยังคงอยู่`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบถัง",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#e11d48",
      background: "#131822",
      color: "#ffffff",
    });
    if (!confirmation.isConfirmed) return;

    setDeletingBinId(bin.binId);
    setBinsError("");
    setBinNotice("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await apiFetch(`${apiUrl}/api/bins/${encodeURIComponent(bin.binId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message || "ลบถังไม่สำเร็จ");
      }
      setBins((current) => current.filter((item) => item.binId !== bin.binId));
      if (selectedBinId === bin.binId) setSelectedBinId(null);
      if (editingBinId === bin.binId) setEditingBinId(null);
      setBinNotice(`ลบถัง ${bin.name} แล้ว`);
    } catch (cause) {
      setBinsError(cause instanceof Error ? cause.message : "ไม่สามารถลบถังได้");
    } finally {
      setDeletingBinId(null);
    }
  }

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;

    const controller = new AbortController();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    async function loadBins() {
      try {
        setBinsLoading(true);
        const response = await apiFetch(`${apiUrl}/api/bins`, {
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
  const editingBin = bins.find((bin) => bin.binId === editingBinId);
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
            <h2 className="text-lg font-bold text-white">เลือกถังขยะ</h2>
            <p className="text-sm text-slate-400">เลือกถังเพื่อดูข้อมูลของถังนั้น</p>
            </div>
            {session?.user?.role === "admin" && !showAddBin && !editingBinId && (
              <button
                type="button"
                disabled={binsLoading}
                onClick={() => { setShowAddBin(true); setEditingBinId(null); setBinNotice(""); }}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Plus size={16} /> เพิ่มถัง
              </button>
            )}
          </div>
          {showAddBin && session?.user?.role === "admin" && session.user.accessToken && (
            <AddBinForm
              accessToken={session.user.accessToken}
              onCancel={() => setShowAddBin(false)}
              onCreated={(bin) => {
                setBins((current) => [...current.filter((item) => item.binId !== bin.binId), {
                  ...bin, level: null, batteryPct: null, voltage: null,
                  sensorStatus: null, lastSeen: null,
                }]);
                setSelectedBinId(bin.binId);
                setShowAddBin(false);
                setBinNotice(`เพิ่มถัง ${bin.name} สำเร็จแล้ว`);
              }}
            />
          )}
          {editingBin && session?.user?.role === "admin" && session.user.accessToken && (
            <EditBinForm
              key={editingBin.binId}
              bin={editingBin}
              accessToken={session.user.accessToken}
              onCancel={() => setEditingBinId(null)}
              onSaved={(updated) => {
                setBins((current) => current.map((bin) =>
                  bin.binId === updated.binId ? { ...bin, ...updated } : bin,
                ));
                setEditingBinId(null);
                setBinsError("");
                setBinNotice(`แก้ไขถัง ${updated.name} แล้ว`);
                void Swal.fire({
                  title: "แก้ไขสำเร็จ",
                  text: `บันทึกข้อมูลถัง ${updated.name} (${updated.binId}) แล้ว`,
                  icon: "success",
                  confirmButtonText: "ตกลง",
                  confirmButtonColor: "#10b981",
                  background: "#131822",
                  color: "#ffffff",
                });
              }}
            />
          )}
          {binNotice && <p role="status" className="mb-3 text-sm text-emerald-400">{binNotice}</p>}
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
                  <div
                    key={bin.binId}
                    className={`rounded-2xl border p-4 transition hover:border-emerald-500/60 ${
                      selected
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-[#212b3d] bg-[#131822]"
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-label={`ดูข้อมูลถัง ${bin.name}`}
                      onClick={() => setSelectedBinId(bin.binId)}
                      className="block w-full text-left"
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
                    {session?.user?.role === "admin" && (
                      <div className="mt-3 flex justify-end gap-1 border-t border-[#293548] pt-2">
                        <button
                          type="button"
                          title={`แก้ไขถัง ${bin.name}`}
                          aria-label={`แก้ไขถัง ${bin.name}`}
                          onClick={() => { setEditingBinId(bin.binId); setShowAddBin(false); setBinsError(""); setBinNotice(""); }}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-[#212b3d] hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-emerald-400"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          title={`ลบถัง ${bin.name}`}
                          aria-label={`ลบถัง ${bin.name}`}
                          disabled={deletingBinId !== null}
                          onClick={() => deleteBin(bin)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline-2 focus-visible:outline-rose-400 disabled:opacity-50"
                        >
                          {deletingBinId === bin.binId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    )}
                  </div>
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
              <BinOverview telemetry={activeTelemetry} binName={activeBin?.name ?? "ถังขยะ"} />
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
            <SensorStatus key={activeBinId} binId={activeBinId} accessToken={session?.user?.accessToken} telemetry={activeTelemetry} />

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
