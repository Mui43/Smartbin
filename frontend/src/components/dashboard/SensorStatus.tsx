"use client";

import { useEffect, useState } from "react";
import { Cpu, RefreshCw } from "lucide-react";
import type { TelemetryData } from "@/hooks/useTelemetry";

type Device = {
  deviceId: string;
  type: string;
  status: "online" | "offline" | "warning";
  lastSeen?: string | null;
  state?: "on" | "off" | "unknown";
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const MAX_AGE_MS = 60_000;

function isFresh(value: string | null | undefined, now: number) {
  if (!value) return false;
  const age = now - new Date(value).getTime();
  return Number.isFinite(age) && age >= 0 && age <= MAX_AGE_MS;
}

export default function SensorStatus({
  binId,
  accessToken,
  telemetry,
}: {
  binId: string;
  accessToken?: string;
  telemetry: TelemetryData | null;
}) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (!accessToken) return;
      try {
        const response = await fetch(`${API_URL}/api/device/bin/${encodeURIComponent(binId)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.devices)) {
          throw new Error(result?.error?.message || "ไม่สามารถโหลดสถานะเซนเซอร์ได้");
        }
        if (!controller.signal.aborted) {
          setDevices(result.devices);
          setError("");
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "ไม่สามารถโหลดสถานะเซนเซอร์ได้");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    const poll = window.setInterval(load, 15_000);
    const clock = window.setInterval(() => setNow(Date.now()), 5_000);
    const events = new EventSource(`${API_URL}/api/realtime`);
    events.addEventListener("device", (event) => {
      try {
        const update = JSON.parse((event as MessageEvent).data);
        if (update.binId !== binId) return;
        setDevices((current) => current.map((device) =>
          device.deviceId === update.deviceId ? { ...device, ...update } : device,
        ));
        setNow(Date.now());
      } catch { /* The next poll will restore device state. */ }
    });
    return () => {
      controller.abort();
      window.clearInterval(poll);
      window.clearInterval(clock);
      events.close();
    };
  }, [binId, accessToken]);

  const sensors = [
    { name: "IR Sensor", type: "IR_SENSOR", hasDetection: true },
    { name: "Proximity Sensor", type: "PROXIMITY_SENSOR", hasDetection: true },
    { name: "Ultrasonic Sensor", type: "ULTRASONIC_SENSOR", hasDetection: false },
  ];

  return (
    <section className="mt-6 rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Monitoring</p>
          <h2 className="mt-1 text-xl font-bold text-white">Sensor Status</h2>
          <p className="mt-1 text-xs text-slate-400">ตรวจจากสัญญาณและข้อมูลที่อุปกรณ์ส่งมาภายใน 60 วินาที</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14] text-slate-400">
          <Cpu size={20} />
        </div>
      </div>
      {error && <p role="alert" className="mb-4 text-sm text-rose-400">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sensors.map((sensor) => {
          const device = devices.find((item) => item.type === sensor.type && item.status === "online" && isFresh(item.lastSeen, now))
            ?? devices.find((item) => item.type === sensor.type);
          const fresh = device?.status === "online" && isFresh(device.lastSeen, now);
          const reading = sensor.hasDetection
            ? device?.state === "on" ? "ตรวจพบวัตถุ" : device?.state === "off" ? "ไม่พบวัตถุ" : "ยังไม่มีค่าจากเซนเซอร์"
            : isFresh(telemetry?.timestamp, now) && Number.isFinite(telemetry?.level)
              ? `ระดับขยะ ${telemetry?.level}%`
              : "ยังไม่มีค่าระดับขยะล่าสุด";
          const hasReading = sensor.hasDetection
            ? device?.state === "on" || device?.state === "off"
            : isFresh(telemetry?.timestamp, now) && Number.isFinite(telemetry?.level);
          const state = loading ? "loading" : error ? "error" : !device ? "missing" : !fresh ? "offline" : !hasReading || device.status === "warning" ? "warning" : "online";
          const color = state === "online" ? "text-emerald-400" : state === "warning" ? "text-amber-400" : state === "loading" ? "text-slate-400" : "text-rose-400";
          const label = state === "online" ? "กำลังรายงานค่า" : state === "warning" ? "ข้อมูลไม่ครบ" : state === "missing" ? "ยังไม่ลงทะเบียน" : state === "loading" ? "กำลังโหลด" : state === "error" ? "ตรวจสอบไม่ได้" : "ขาดการเชื่อมต่อ";
          return (
            <div key={sensor.type} className="rounded-xl border border-[#212b3d] bg-[#0a0d14] p-4 transition hover:border-slate-600">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-200">{sensor.name}</p>
                <span className={`text-xs font-semibold ${color}`}>{state === "loading" && <RefreshCw className="inline h-3 w-3 animate-spin" />} {label}</span>
              </div>
              <p className={`mt-4 text-sm ${fresh ? "text-slate-300" : "text-slate-500"}`}>
                {state === "error" ? "โหลดสถานะจาก Backend ไม่สำเร็จ" : fresh ? reading : state === "missing" ? "ไม่มีอุปกรณ์ชนิดนี้ในถัง" : "ไม่มีสัญญาณล่าสุดจากอุปกรณ์"}
              </p>
              {device?.lastSeen && <p className="mt-2 text-xs text-slate-500">ส่งสัญญาณล่าสุด {new Date(device.lastSeen).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
