"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  Cpu,
  Wifi,
  WifiOff,
  MapPin,
  ChevronRight,
  Loader2,
  Command,
  X,
  Server,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";

interface Bin {
  _id?: string;
  id?: string;
  binId: string;
  name: string;
  location: string;
  mqttTopic: string;
  thresholdPct: number;
  level?: number;
  batteryPct?: number;
  voltage?: number;
  lastSeen?: string;
}

interface Device {
  _id?: string;
  deviceId: string;
  binId: string;
  name: string;
  type: string;
  description?: string;
  status: "online" | "offline" | "warning";
  lastSeen?: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function DevicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [bins, setBins] = useState<Bin[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const accessToken = session?.user?.accessToken;

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const headers = {
          Authorization: `Bearer ${accessToken}`,
        };

        const [binsResponse, devicesResponse] = await Promise.all([
          fetch(`${API_URL}/api/bins`, {
            headers,
            cache: "no-store",
            signal,
          }),
          fetch(`${API_URL}/api/device`, {
            headers,
            cache: "no-store",
            signal,
          }),
        ]);

        const binsResult = await binsResponse.json();
        const devicesResult = await devicesResponse.json();

        if (!binsResponse.ok) {
          throw new Error(
            binsResult?.error?.message || "ไม่สามารถโหลดข้อมูล Bin ได้",
          );
        }

        if (!devicesResponse.ok) {
          throw new Error(
            devicesResult?.error?.message ||
              "ไม่สามารถโหลดข้อมูล Device ได้",
          );
        }

        setBins(binsResult?.data || []);
        setDevices(devicesResult?.devices || []);
      } catch (err: any) {
        if (err.name === "AbortError") return;

        console.error("Load devices page error:", err);

        setError(
          err?.message || "ไม่สามารถเชื่อมต่อ Backend ได้",
        );
      } finally {
        setLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    const controller = new AbortController();

    if (status === "authenticated") {
      loadData(controller.signal);
    }

    return () => {
      controller.abort();
    };
  }, [status, loadData]);

  const deviceStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        total: number;
        online: number;
        offline: number;
        warning: number;
      }
    >();

    for (const device of devices) {
      const current = stats.get(device.binId) || {
        total: 0,
        online: 0,
        offline: 0,
        warning: 0,
      };

      current.total++;

      if (device.status === "online") {
        current.online++;
      } else if (device.status === "warning") {
        current.warning++;
      } else {
        current.offline++;
      }

      stats.set(device.binId, current);
    }

    return stats;
  }, [devices]);

  const totalDevices = devices.length;

  const onlineDevices = devices.filter(
    (device) => device.status === "online",
  ).length;

  const offlineDevices = devices.filter(
    (device) => device.status === "offline",
  ).length;

  const filteredBins = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return bins;
    }

    return bins.filter((bin) =>
      [bin.binId, bin.name, bin.location, bin.mqttTopic]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [bins, search]);

  function openBin(binId: string) {
    router.push(`/devices/${encodeURIComponent(binId)}`);
  }

  if (status === "loading") {
    return <PageLoading />;
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0d14] p-6 text-white">
        กรุณาเข้าสู่ระบบ
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0d14] text-white">
      <Sidebar />

      <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-500">
              Hardware Monitoring
            </p>

            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Devices
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              เลือก Smart Bin เพื่อดูสถานะ Hardware ภายในถัง
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {loading ? (
            <SummarySkeleton />
          ) : (
            <>
              <SummaryCard
                label="Total Devices"
                value={totalDevices}
                icon={<Cpu className="h-5 w-5 text-slate-400" />}
              />

              <SummaryCard
                label="Online"
                value={onlineDevices}
                icon={
                  <Wifi className="h-5 w-5 text-emerald-400" />
                }
              />

              <SummaryCard
                label="Offline"
                value={offlineDevices}
                icon={
                  <WifiOff className="h-5 w-5 text-rose-400" />
                }
              />
            </>
          )}
        </div>

        {/* Search */}
        <DeviceSearchBar
          search={search}
          onSearchChange={setSearch}
          totalResults={filteredBins.length}
        />

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Bin List */}
        <div className="mt-6">
          {loading ? (
            <LoadingCards />
          ) : filteredBins.length === 0 ? (
            <EmptyState search={search} />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredBins.map((bin) => {
                const stats = deviceStats.get(bin.binId) || {
                  total: 0,
                  online: 0,
                  offline: 0,
                  warning: 0,
                };

                return (
                  <BinDeviceCard
                    key={bin._id || bin.id || bin.binId}
                    bin={bin}
                    stats={stats}
                    onClick={() => openBin(bin.binId)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ==================================================
   Bin Device Card
================================================== */

function BinDeviceCard({
  bin,
  stats,
  onClick,
}: {
  bin: Bin;
  stats: {
    total: number;
    online: number;
    offline: number;
    warning: number;
  };
  onClick: () => void;
}) {
  const level = Math.min(Math.max(bin.level ?? 0, 0), 100);
  const battery = Math.min(
    Math.max(bin.batteryPct ?? 0, 0),
    100,
  );

  const overallStatus =
    stats.total === 0
      ? "empty"
      : stats.online === stats.total
        ? "online"
        : stats.online > 0 || stats.warning > 0
          ? "warning"
          : "offline";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full overflow-hidden rounded-xl border border-[#212b3d] bg-[#131822] text-left shadow-lg transition duration-200 hover:border-emerald-500/40 hover:shadow-emerald-950/20 active:scale-[0.99]"
    >
      {/* Header */}
      <div className="border-b border-[#212b3d] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14]">
                <Server className="h-5 w-5 text-emerald-400" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-white">
                  {bin.name}
                </p>

                <p className="mt-1 font-mono text-xs text-slate-400">
                  {bin.binId}
                </p>
              </div>
            </div>
          </div>

          <BinStatusBadge status={overallStatus} />
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{bin.location}</span>
        </div>
      </div>

      {/* Device Stats */}
      <div className="grid grid-cols-3 gap-px bg-[#212b3d]">
        <DeviceStat
          label="Devices"
          value={String(stats.total)}
        />

        <DeviceStat
          label="Online"
          value={String(stats.online)}
        />

        <DeviceStat
          label="Offline"
          value={String(stats.offline)}
        />
      </div>

      {/* Bin information */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4">
          <InfoItem
            label="Waste Level"
            value={`${level}%`}
          />

          <InfoItem
            label="Battery"
            value={`${battery}%`}
          />

          <InfoItem
            label="Voltage"
            value={
              bin.voltage !== undefined
                ? `${bin.voltage.toFixed(1)}V`
                : "--"
            }
          />

          <InfoItem
            label="Threshold"
            value={`${bin.thresholdPct}%`}
          />
        </div>

        {/* Waste level */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Waste level
            </span>

            <span className="font-semibold text-amber-400">
              {level}%
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#0a0d14]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 transition-all duration-300"
              style={{ width: `${level}%` }}
            />
          </div>
        </div>

        {/* Open button */}
        <div className="mt-5 flex items-center justify-between border-t border-[#212b3d] pt-4">
          <div>
            <p className="text-xs text-slate-500">
              Hardware
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              {stats.total} devices
            </p>
          </div>

          <div className="flex items-center gap-1 text-sm font-semibold text-emerald-400 transition group-hover:text-emerald-300">
            View Devices
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </button>
  );
}

/* ==================================================
   Search
================================================== */

function DeviceSearchBar({
  search,
  onSearchChange,
  totalResults,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  totalResults: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative mt-6 w-full">
      <div className="group relative flex items-center overflow-hidden rounded-xl border border-[#212b3d] bg-[#131822] p-1.5 shadow-md transition-all focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20">
        <div className="flex items-center pl-3.5 pr-2 text-slate-400 group-focus-within:text-emerald-400">
          <Search className="h-5 w-5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          placeholder="ค้นหา Bin ID, ชื่อ Bin, สถานที่ หรือ MQTT Topic..."
          className="w-full bg-transparent py-2 pl-1 pr-3 text-sm text-white placeholder-slate-500 outline-none sm:text-base"
        />

        <div className="flex items-center gap-2 pr-2">
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-[#212b3d] hover:text-white"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {search ? (
            <span className="hidden whitespace-nowrap rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 sm:inline-block">
              {totalResults} bins
            </span>
          ) : (
            <kbd className="hidden items-center gap-1 rounded-md border border-[#212b3d] bg-[#0a0d14] px-2 py-1 text-[10px] font-medium text-slate-400 sm:inline-flex">
              <Command className="h-3 w-3" />
              K
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================================================
   Summary Card
================================================== */

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#212b3d] bg-[#131822] p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#212b3d] bg-[#0a0d14]">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ==================================================
   Device Stat
================================================== */

function DeviceStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#0a0d14] p-4">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-white">
        {value}
      </p>
    </div>
  );
}

/* ==================================================
   Info Item
================================================== */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

/* ==================================================
   Status
================================================== */

function BinStatusBadge({
  status,
}: {
  status: "online" | "offline" | "warning" | "empty";
}) {
  const config = {
    online: {
      label: "Online",
      className:
        "border-emerald-900 bg-emerald-950/60 text-emerald-400",
      dot: "bg-emerald-400",
    },
    warning: {
      label: "Warning",
      className:
        "border-amber-900 bg-amber-950/60 text-amber-400",
      dot: "bg-amber-400",
    },
    offline: {
      label: "Offline",
      className:
        "border-rose-900 bg-rose-950/60 text-rose-400",
      dot: "bg-rose-400",
    },
    empty: {
      label: "No Devices",
      className:
        "border-slate-700 bg-slate-900/60 text-slate-400",
      dot: "bg-slate-500",
    },
  };

  const current = config[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${current.className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${current.dot}`}
      />

      {current.label}
    </span>
  );
}

/* ==================================================
   Loading
================================================== */

function LoadingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className="animate-pulse overflow-hidden rounded-xl border border-[#212b3d] bg-[#131822]"
        >
          <div className="space-y-4 border-b border-[#212b3d] p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#212b3d]" />

              <div className="space-y-2">
                <div className="h-5 w-32 rounded bg-[#212b3d]" />
                <div className="h-3 w-16 rounded bg-[#212b3d]/60" />
              </div>
            </div>

            <div className="h-4 w-32 rounded bg-[#212b3d]" />
          </div>

          <div className="grid grid-cols-3 gap-px bg-[#212b3d]">
            {[1, 2, 3].map((stat) => (
              <div
                key={stat}
                className="space-y-2 bg-[#0a0d14] p-4"
              >
                <div className="h-3 w-12 rounded bg-[#212b3d]" />
                <div className="h-4 w-8 rounded bg-[#212b3d]" />
              </div>
            ))}
          </div>

          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="space-y-2">
                  <div className="h-3 w-16 rounded bg-[#212b3d]" />
                  <div className="h-4 w-12 rounded bg-[#212b3d]" />
                </div>
              ))}
            </div>

            <div className="h-2 rounded-full bg-[#0a0d14]" />

            <div className="h-8 rounded bg-[#212b3d]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-xl border border-[#212b3d] bg-[#131822] p-5 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-[#212b3d]" />
              <div className="h-8 w-12 rounded bg-[#212b3d]" />
            </div>

            <div className="h-10 w-10 rounded-lg bg-[#0a0d14]" />
          </div>
        </div>
      ))}
    </>
  );
}

/* ==================================================
   Empty
================================================== */

function EmptyState({
  search,
}: {
  search: string;
}) {
  return (
    <div className="rounded-xl border border-[#212b3d] bg-[#131822] p-10 text-center shadow-lg">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#212b3d] bg-[#0a0d14] text-slate-400">
        <Cpu className="h-8 w-8" />
      </div>

      <h2 className="mt-5 text-lg font-bold text-white">
        {search ? "ไม่พบ Bin" : "ยังไม่มี Smart Bin"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
        {search
          ? "ลองเปลี่ยนคำค้นหาแล้วค้นหาอีกครั้ง"
          : "ยังไม่มี Smart Bin ในระบบ"}
      </p>
    </div>
  );
}

/* ==================================================
   Page Loading
================================================== */

function PageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0d14] text-white">
      <div className="text-center text-slate-400">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />

        <p className="mt-3 text-sm">
          Loading Devices...
        </p>
      </div>
    </main>
  );
}
