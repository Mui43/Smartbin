"use client";
import { apiFetch } from "@/lib/apiFetch";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Database, RefreshCw } from "lucide-react";
import type { TelemetryHistory } from "@/hooks/useTelemetryHistory";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "--";
  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function SensorBadge({ value }: { value?: string }) {
  const status = value || "unknown";
  const labels: Record<string, string> = {
    ok: "ทำงานปกติ",
    warning: "ควรตรวจสอบ",
    error: "ขัดข้อง",
    offline: "ไม่เชื่อมต่อ",
    unknown: "ไม่ทราบสถานะ",
  };
  const color = status === "ok" ? "text-emerald-400 bg-emerald-500/10" : status === "warning" ? "text-amber-400 bg-amber-500/10" : status === "error" ? "text-rose-400 bg-rose-500/10" : "text-slate-400 bg-slate-500/10";
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${color}`}>{labels[status] ?? labels.unknown}</span>;
}

export default function TelemetryTable({ binId }: { binId?: string }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [rows, setRows] = useState<TelemetryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal, silent = false) => {
    if (!binId || !token) {
      setLoading(false);
      return;
    }
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await apiFetch(`${API_URL}/api/bins/${encodeURIComponent(binId)}/telemetry?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal,
      });
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result?.error?.message || "ไม่สามารถโหลดข้อมูล Telemetry ได้");
      }
      if (!signal?.aborted) {
        setRows(result.data);
        setError("");
      }
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "ไม่สามารถโหลดข้อมูล Telemetry ได้");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [binId, token]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const poll = window.setInterval(() => load(controller.signal, true), 15_000);
    const events = new EventSource(`${API_URL}/api/realtime`);
    let timer: number | undefined;
    events.addEventListener("telemetry", (event) => {
      try {
        if (JSON.parse((event as MessageEvent).data).binId !== binId) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => load(controller.signal, true), 300);
      } catch { /* Periodic refresh still applies. */ }
    });
    return () => {
      controller.abort();
      window.clearInterval(poll);
      window.clearTimeout(timer);
      events.close();
    };
  }, [binId, load]);

  return (
    <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14] text-emerald-400"><Database size={20} /></div>
          <div>
            <h2 className="text-lg font-bold text-white">Telemetry Logs</h2>
            <p className="text-xs text-slate-400">{binId ? `ข้อมูล 10 รายการล่าสุดของถัง ${binId}` : "ยังไม่ได้เลือกถัง"}</p>
          </div>
        </div>
        <button type="button" onClick={() => load(undefined, true)} disabled={!binId || !token || loading || refreshing} className="flex items-center gap-2 rounded-xl border border-[#212b3d] bg-[#0a0d14] px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-[#212b3d] disabled:opacity-50">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />รีเฟรช
        </button>
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-rose-400">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-[#212b3d] bg-[#0a0d14]">
        <table className="w-full min-w-[850px] text-left text-sm text-slate-300">
          <thead className="border-b border-[#212b3d] bg-[#131822] text-xs font-semibold uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">เวลา (ไทย)</th><th className="px-4 py-3">ปริมาณขยะ</th><th className="px-4 py-3">Capacitive</th><th className="px-4 py-3">Inductive</th><th className="px-4 py-3">Level Sensor</th><th className="px-4 py-3">แรงดัน</th><th className="px-4 py-3">แบตเตอรี่</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#212b3d]/60">
            {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">กำลังโหลดข้อมูล...</td></tr>
              : rows.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">ยังไม่มีข้อมูล Telemetry ของถังนี้</td></tr>
              : rows.slice(0, 10).map((item) => (
                <tr key={item._id} className="transition hover:bg-[#212b3d]/30">
                  <td className="whitespace-nowrap px-4 py-3 text-xs">{formatDate(item.timestamp)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-400">{item.level != null ? `${item.level}%` : "--"}</td>
                  <td className="px-4 py-3"><SensorBadge value={item.sensorStatus?.capacitive} /></td>
                  <td className="px-4 py-3"><SensorBadge value={item.sensorStatus?.inductive} /></td>
                  <td className="px-4 py-3"><SensorBadge value={item.sensorStatus?.level} /></td>
                  <td className="px-4 py-3">{typeof item.voltage === "number" ? `${item.voltage.toFixed(1)} V` : "--"}</td>
                  <td className="px-4 py-3">{item.batteryPct != null ? `${item.batteryPct}%` : "--"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
