"use client";

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
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";

    case "warning":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";

    case "offline":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
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
          await fetch(
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />

        <main className="ml-64 p-8">
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />

        <main className="ml-64 p-8">
          <button
            onClick={() =>
              router.push(
                `/devices/${encodeURIComponent(
                  binId
                )}`
              )
            }
            className="mb-6 flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={18} />
            กลับ
          </button>

          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />

      <main className="ml-64 p-8">
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
            className="mb-5 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft size={18} />
            กลับไปยัง Devices
          </button>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Cpu size={28} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {device.name}
                  </h1>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
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

          <span className="text-gray-600 dark:text-gray-400">
            {sseConnected
              ? "Real-time connected"
              : "Real-time disconnected"}
          </span>
        </div>

        {/* Cards */}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* Status */}

          <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-3">
              <Activity
                className="text-blue-500"
                size={22}
              />

              <h2 className="font-semibold text-gray-900 dark:text-white">
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

          <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-3">
              <Cpu
                className="text-purple-500"
                size={22}
              />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                ประเภท Hardware
              </h2>
            </div>

            <p className="font-medium text-gray-900 dark:text-white">
              {device.type}
            </p>
          </div>

          {/* Last Seen */}

          <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-3">
              <Clock
                className="text-orange-500"
                size={22}
              />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Last Seen
              </h2>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300">
              {formatDate(
                device.lastSeen
              )}
            </p>
          </div>

          {/* Bin */}

          <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-3">
              <MapPin
                className="text-green-500"
                size={22}
              />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Smart Bin
              </h2>
            </div>

            {bin ? (
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {bin.name}
                </p>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {bin.binId}
                </p>

                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {bin.location}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                ไม่พบข้อมูล Bin
              </p>
            )}
          </div>

          {/* Device ID */}

          <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">
              Device ID
            </h2>

            <code className="break-all rounded-lg bg-gray-100 px-3 py-2 text-sm dark:bg-gray-800">
              {device.deviceId}
            </code>
          </div>

          {/* Description */}

          <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">
              รายละเอียด
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              {device.description ||
                "ไม่มีรายละเอียด"}
            </p>
          </div>
        </div>

        {/* Metadata */}

        {device.metadata &&
          Object.keys(
            device.metadata
          ).length > 0 && (
            <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">
                Metadata
              </h2>

              <pre className="overflow-x-auto rounded-xl bg-gray-100 p-4 text-sm dark:bg-gray-800">
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
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
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