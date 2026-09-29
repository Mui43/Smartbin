"use client";
import { apiFetch } from "@/lib/apiFetch";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  Cpu,
  Activity,
  Clock,
  MapPin,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { useSession } from "next-auth/react";

import Sidebar from "@/components/layout/Sidebar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

type DeviceStatus =
  | "online"
  | "offline"
  | "warning";

type DeviceType =
  | "ESP32"
  | "IR_SENSOR"
  | "PROXIMITY_SENSOR"
  | "ULTRASONIC_SENSOR"
  | "SERVO_MOTOR"
  | "BUZZER"
  | "DOOR_LOCK"
  | "OTHER";

interface Device {
  deviceId: string;
  binId: string;
  name: string;
  type: DeviceType;
  description?: string;
  status: DeviceStatus;
  state?: "on" | "off" | "unknown";
  lastSeen?: string;
  metadata?: Record<
    string,
    unknown
  >;
  createdAt?: string;
  updatedAt?: string;
}

interface Bin {
  binId: string;
  name: string;
  location: string;
}

interface DeviceResponse {
  success: boolean;
  device: Device;
  bin: Bin | null;
}

function getStatusText(
  status: DeviceStatus
) {
  switch (status) {
    case "online":
      return "Online";

    case "warning":
      return "Warning";

    case "offline":
      return "Offline";

    default:
      return status;
  }
}

function getStatusClass(
  status: DeviceStatus
) {
  switch (status) {
    case "online":
      return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

    case "warning":
      return "border border-amber-500/20 bg-amber-500/10 text-amber-400";

    case "offline":
      return "border border-rose-500/20 bg-rose-500/10 text-rose-400";

    default:
      return "border border-[#212b3d] bg-[#0a0d14] text-slate-400";
  }
}

function StatusIcon({
  status,
}: {
  status: DeviceStatus;
}) {
  if (status === "online") {
    return (
      <Wifi
        size={18}
      />
    );
  }

  if (status === "warning") {
    return (
      <AlertTriangle
        size={18}
      />
    );
  }

  return (
    <WifiOff
      size={18}
    />
  );
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "th-TH",
    {
      timeZone: "Asia/Bangkok",
      dateStyle: "medium",
      timeStyle: "medium",
    }
  );
}

export default function DeviceDetailPage() {
  const router = useRouter();

  const params =
    useParams<{
      binId: string;
      deviceId: string;
    }>();

  const binId =
    params.binId;

  const deviceId =
    params.deviceId;

  const { status: sessionStatus } =
    useSession();

  const [device, setDevice] =
    useState<Device | null>(
      null
    );

  const [bin, setBin] =
    useState<Bin | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [sseConnected, setSseConnected] =
    useState(false);

  // ==================================
  // Fetch Device
  // ==================================

  const loadDevice =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await apiFetch(
            `${API_URL}/api/device/${encodeURIComponent(
              deviceId
            )}`,
            {
              cache: "no-store",
            }
          );

        const data =
          (await response.json()) as DeviceResponse;

        if (!response.ok) {
          throw new Error(
            data?.success === false
              ? "ไม่พบ Device"
              : "ไม่สามารถโหลด Device ได้"
          );
        }

        setDevice(
          data.device
        );

        setBin(
          data.bin
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "เกิดข้อผิดพลาด"
        );
      } finally {
        setLoading(false);
      }
    }, [deviceId]);

  // ==================================
  // Initial load
  // ==================================

  useEffect(() => {
    if (
      sessionStatus ===
      "authenticated"
    ) {
      loadDevice();
    }
  }, [
    sessionStatus,
    loadDevice,
  ]);

  // ==================================
  // SSE Real-time
  // ==================================

  useEffect(() => {
    if (
      sessionStatus !==
      "authenticated"
    ) {
      return;
    }

    const eventSource =
      new EventSource(
        `${API_URL}/api/realtime`
      );

    eventSource.addEventListener(
      "connected",
      () => {
        console.log(
          "🟢 SSE connected"
        );

        setSseConnected(true);
      }
    );

    eventSource.addEventListener(
      "device",
      (event) => {
        try {
          const data =
            JSON.parse(
              event.data
            );

          if (
            data.binId !==
              binId ||
            data.deviceId !==
              deviceId
          ) {
            return;
          }

          setDevice(
            (current) => {
              if (!current) {
                return current;
              }

              return {
                ...current,

                status:
                  data.status ??
                  current.status,

                lastSeen:
                  data.lastSeen ??
                  current.lastSeen,
                state: data.state ?? current.state,
              };
            }
          );
        } catch (error) {
          console.error(
            "❌ SSE device event error:",
            error
          );
        }
      }
    );

    eventSource.onerror = () => {
      console.log(
        "🔴 SSE disconnected"
      );

      setSseConnected(false);
    };

    return () => {
      eventSource.close();

      setSseConnected(false);
    };
  }, [
    sessionStatus,
    binId,
    deviceId,
  ]);

  // ==================================
  // Loading
  // ==================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] text-white">
        <Sidebar />

        <main className="p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8">
          <div className="flex items-center gap-3">
            <RefreshCw
              className="animate-spin"
              size={22}
            />

            <span>
              กำลังโหลด Device...
            </span>
          </div>
        </main>
      </div>
    );
  }

  // ==================================
  // Error
  // ==================================

  if (error || !device) {
    return (
      <div className="min-h-screen bg-[#0a0d14] text-white">
        <Sidebar />

        <main className="p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8">
          <button
            onClick={() =>
              router.push(
                `/devices/${encodeURIComponent(
                  binId
                )}`
              )
            }
            className="mb-6 flex items-center gap-2 rounded-lg border border-[#212b3d] bg-[#131822] px-4 py-2 transition hover:border-emerald-500/40 hover:text-emerald-400"
          >
            <ArrowLeft size={18} />
            กลับ
          </button>

          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-400">
            {error ||
              "ไม่พบ Device"}
          </div>
        </main>
      </div>
    );
  }

  // ==================================
  // Main UI
  // ==================================

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white">
      <Sidebar />

      <main className="p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8">
        {/* Header */}

        <div className="mb-8">
          <button
            onClick={() =>
              router.push(
                `/devices/${encodeURIComponent(
                  binId
                )}`
              )
            }
            className="mb-5 flex items-center gap-2 text-sm text-slate-400 transition hover:text-emerald-400"
          >
            <ArrowLeft size={18} />
            กลับไปยัง Devices
          </button>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-[#212b3d] bg-[#131822] p-3 text-emerald-400">
                  <Cpu size={28} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {device.name}
                  </h1>

                  <p className="text-sm text-slate-400">
                    {device.deviceId}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${getStatusClass(
                device.status
              )}`}
            >
              <StatusIcon
                status={
                  device.status
                }
              />

              {getStatusText(
                device.status
              )}
            </div>
          </div>
        </div>

        {/* SSE Status */}

        <div className="mb-6 flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              sseConnected
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          />

          <span className="text-slate-400">
            {sseConnected
              ? "Real-time connected"
              : "Real-time disconnected"}
          </span>
        </div>

        {/* Cards */}

        <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Status */}

          <div className="flex h-full min-h-[180px] flex-col rounded-2xl border border-[#212b3d] bg-[#131822] p-6 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-emerald-950/20">
            <div className="mb-4 flex items-center gap-3">
              <Activity
                className="text-blue-500"
                size={22}
              />

              <h2 className="font-semibold text-white">
                สถานะ
              </h2>
            </div>

            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${getStatusClass(
                device.status
              )}`}
            >
              <StatusIcon
                status={
                  device.status
                }
              />

              {getStatusText(
                device.status
              )}
            </div>
          </div>

          {/* Type */}

          <div className="flex h-full min-h-[180px] flex-col rounded-2xl border border-[#212b3d] bg-[#131822] p-6 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-emerald-950/20">
            <div className="mb-4 flex items-center gap-3">
              <Cpu
                className="text-purple-500"
                size={22}
              />

              <h2 className="font-semibold text-white">
                ประเภท Hardware
              </h2>
            </div>

            <p className="font-medium text-white">
              {device.type}
            </p>
          </div>

          {/* Last Seen */}

          <div className="flex h-full min-h-[180px] flex-col rounded-2xl border border-[#212b3d] bg-[#131822] p-6 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-emerald-950/20">
            <div className="mb-4 flex items-center gap-3">
              <Clock
                className="text-orange-500"
                size={22}
              />

              <h2 className="font-semibold text-white">
                Last Seen
              </h2>
            </div>

            <p className="text-sm text-slate-300">
              {formatDate(
                device.lastSeen
              )}
            </p>
          </div>

          {/* Bin */}

          <div className="flex h-full min-h-[180px] flex-col rounded-2xl border border-[#212b3d] bg-[#131822] p-6 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-emerald-950/20">
            <div className="mb-4 flex items-center gap-3">
              <MapPin
                className="text-green-500"
                size={22}
              />

              <h2 className="font-semibold text-white">
                Smart Bin
              </h2>
            </div>

            {bin ? (
              <div>
                <p className="font-medium text-white">
                  {bin.name}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {bin.binId}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {bin.location}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                ไม่พบข้อมูล Bin
              </p>
            )}
          </div>

          {/* Device ID */}

          <div className="flex h-full min-h-[180px] flex-col rounded-2xl border border-[#212b3d] bg-[#131822] p-6 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-emerald-950/20">
            <h2 className="mb-4 font-semibold text-white">
              Device ID
            </h2>

            <code className="break-all rounded-lg border border-[#212b3d] bg-[#0a0d14] px-3 py-2 text-sm text-slate-300">
              {device.deviceId}
            </code>
          </div>

          {/* Description */}

          <div className="flex h-full min-h-[180px] flex-col rounded-2xl border border-[#212b3d] bg-[#131822] p-6 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-emerald-950/20">
            <h2 className="mb-4 font-semibold text-white">
              รายละเอียด
            </h2>

            <p className="text-sm text-slate-400">
              {device.description ||
                "ไม่มีรายละเอียด"}
            </p>
          </div>
        </div>

        {device.type === "ESP32" && (
          <div className="mt-6 rounded-2xl border border-[#212b3d] bg-[#131822] p-5 text-sm text-slate-300 transition duration-200 hover:border-emerald-500/40">
            <p className="font-semibold text-white">การเชื่อมต่อ ESP32</p>
            <p className="mt-2">
              ตั้ง Device ID ในเฟิร์มแวร์เป็น <code>{device.deviceId}</code> และตั้ง Wi-Fi,
              ที่อยู่ backend กับ DEVICE_API_KEY ให้ตรงกัน สถานะ Online หมายถึง backend
              ได้รับ heartbeat จากบอร์ดล่าสุด และระบบตรวจออฟไลน์ทุก 30 วินาที
            </p>
          </div>
        )}

        {/* Metadata */}

        {device.metadata &&
          Object.keys(
            device.metadata
          ).length > 0 && (
            <div className="mt-6 flex h-full min-h-[180px] flex-col rounded-2xl border border-[#212b3d] bg-[#131822] p-6 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-emerald-950/20">
              <h2 className="mb-4 font-semibold text-white">
                Metadata
              </h2>

              <pre className="overflow-x-auto rounded-xl bg-[#0a0d14] p-4 text-sm text-slate-300">
                {JSON.stringify(
                  device.metadata,
                  null,
                  2
                )}
              </pre>
            </div>
          )}

        {/* Refresh */}

        <div className="mt-6 flex justify-end">
          <button
            onClick={loadDevice}
            className="flex items-center gap-2 rounded-lg border border-[#212b3d] bg-[#131822] px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-emerald-500/40 hover:bg-[#212b3d] hover:text-white"
          >
            <RefreshCw
              size={16}
            />

            รีเฟรช
          </button>
        </div>
      </main>
    </div>
  );
}
