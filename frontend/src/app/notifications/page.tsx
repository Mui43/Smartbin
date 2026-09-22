"use client";

import { useEffect, useState, ElementType, ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  Bell,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

/* ==================================================
   Types & Interfaces
================================================== */

export type AlertType =
  | "FULL"
  | "NEAR_FULL"
  | "SENSOR_ERROR"
  | "LOW_BATTERY"
  | "OFFLINE";
export type AlertLevel = "warning" | "critical";

export interface AlertData {
  _id?: string;
  binId: string;
  binName?: string;
  location?: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  active?: boolean;
  sentToLine?: boolean;
  createdAt?: string;
  resolvedAt?: string;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/* ==================================================
   Constants
================================================== */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const ALERT_TYPES: { value: string; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "FULL", label: "Full" },
  { value: "NEAR_FULL", label: "Near Full" },
  { value: "SENSOR_ERROR", label: "Sensor Error" },
  { value: "LOW_BATTERY", label: "Low Battery" },
  { value: "OFFLINE", label: "Offline" },
];

/* ==================================================
   Main Component
================================================== */

export default function NotificationsPage() {
  const { data: session, status } = useSession();

  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  const [type, setType] = useState("");
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAlerts() {
    if (!session?.user?.accessToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });

      if (type) params.set("type", type);
      if (active !== "") params.set("active", active);

      const response = await fetch(
        `${API_URL}/api/alerts/history?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message || "ไม่สามารถโหลดการแจ้งเตือนได้");
        setAlerts([]);
        setPagination(null);
        return;
      }

      if (result.success) {
        setAlerts(result.data || []);
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error("Load alerts error:", err);
      setError("ไม่สามารถเชื่อมต่อ Backend ได้");
      setAlerts([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadAlerts();
    }
  }, [status, session, page, type, active]);

  function handleResetFilters() {
    setType("");
    setActive("");
    setPage(1);
  }

  if (status === "loading") {
    return <PageSkeleton />;
  }

  if (status !== "authenticated" || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#202A30] p-4 text-[#EBF4DD]">
        <div className="rounded-xl border border-[#5A7863]/30 bg-[#3B4953] p-6 text-center shadow-xl">
          <p className="text-[#90AB8B]">กรุณาเข้าสู่ระบบ</p>
        </div>
      </main>
    );
  }

  const total = pagination?.total || 0;
  const activeCount = alerts.filter((alert) => alert.active).length;
  const criticalCount = alerts.filter(
    (alert) => alert.level === "critical",
  ).length;
  const lineSentCount = alerts.filter((alert) => alert.sentToLine).length;

  return (
    <main className="min-h-screen bg-[#202A30] text-[#EBF4DD]">
      <Sidebar />

      <div className="p-4 pt-20 sm:p-6 lg:ml-64 lg:p-8">
        <Header />

        {/* Page Header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#90AB8B]">
            Monitoring
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-[#90AB8B]">
            ตรวจสอบการแจ้งเตือนและสถานะของ Smart Bin
          </p>
        </div>

        {/* Summary Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Alerts" value={total} icon={Bell} />
          <SummaryCard
            title="Active"
            value={activeCount}
            icon={Activity}
            accent="green"
          />
          <SummaryCard
            title="Critical"
            value={criticalCount}
            icon={AlertTriangle}
            accent="red"
          />
          <SummaryCard
            title="LINE Sent"
            value={lineSentCount}
            icon={CheckCircle2}
            accent="green"
          />
        </div>

        {/* Filters Section */}
        <section className="mt-6 rounded-2xl border border-[#5A7863]/30 bg-[#3B4953] p-5 shadow-xl sm:p-6">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-[#90AB8B]" />
            <h2 className="font-semibold">Filter Alerts</h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* Type Selector */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#90AB8B]">
                Alert Type
              </label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[#5A7863]/40 bg-[#202A30] p-3 text-sm text-[#EBF4DD] outline-none transition focus:border-[#90AB8B] focus:ring-2 focus:ring-[#90AB8B]/20"
              >
                {ALERT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Selector */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#90AB8B]">
                Status
              </label>
              <select
                value={active}
                onChange={(e) => {
                  setActive(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[#5A7863]/40 bg-[#202A30] p-3 text-sm text-[#EBF4DD] outline-none transition focus:border-[#90AB8B] focus:ring-2 focus:ring-[#90AB8B]/20"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Resolved</option>
              </select>
            </div>
          </div>

          {(type || active) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#90AB8B] underline underline-offset-4 hover:text-[#EBF4DD]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </section>

        {/* Error Alert */}
        {error && (
          <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Alerts List Container */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-[#5A7863]/30 bg-[#3B4953] shadow-xl">
          <div className="border-b border-[#5A7863]/30 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#90AB8B]">
                  Alert History
                </p>
                <h2 className="mt-1 text-xl font-bold">Notifications</h2>
              </div>

              <button
                type="button"
                onClick={loadAlerts}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-[#5A7863]/40 bg-[#202A30] px-3.5 py-2 text-sm text-[#EBF4DD] transition hover:bg-[#5A7863] active:scale-[0.98] disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {loading ? (
            <TableSkeleton />
          ) : alerts.length === 0 ? (
            <EmptyAlerts />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1000px] text-left">
                  <thead>
                    <tr className="border-b border-[#5A7863]/30 bg-[#202A30]/50">
                      <TableHead>Time</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>LINE</TableHead>
                      <TableHead>Resolved</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#5A7863]/20 text-sm">
                    {alerts.map((alert) => (
                      <tr
                        key={alert._id || `${alert.binId}-${alert.createdAt}`}
                        className="transition hover:bg-[#5A7863]/10"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-[#90AB8B]">
                          {formatDate(alert.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#EBF4DD]">
                            {alert.binName || alert.binId}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[#90AB8B]">
                            {alert.binId}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <TypeBadge type={alert.type} />
                        </td>
                        <td className="px-5 py-4">
                          <LevelBadge level={alert.level} />
                        </td>
                        <td className="max-w-xs px-5 py-4 text-[#EBF4DD]">
                          {alert.message}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge active={alert.active} />
                        </td>
                        <td className="px-5 py-4">
                          <LineBadge sent={alert.sentToLine} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-[#90AB8B]">
                          {formatDate(alert.resolvedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="space-y-4 p-4 md:hidden">
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert._id || `${alert.binId}-${alert.createdAt}`}
                    alert={alert}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination && (
                <PaginationControls
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  hasPrevious={pagination.hasPreviousPage}
                  hasNext={pagination.hasNextPage}
                  onPrevious={() =>
                    setPage((current) => Math.max(current - 1, 1))
                  }
                  onNext={() => setPage((current) => current + 1)}
                />
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

/* ==================================================
   Sub-Components
================================================== */

function SummaryCard({
  title,
  value,
  icon: Icon,
  accent = "normal",
}: {
  title: string;
  value: number;
  icon: ElementType;
  accent?: "normal" | "green" | "red";
}) {
  const iconClass =
    accent === "red"
      ? "bg-red-400/10 text-red-300 border border-red-400/20"
      : accent === "green"
        ? "bg-[#90AB8B]/10 text-[#90AB8B] border border-[#90AB8B]/20"
        : "bg-[#5A7863]/30 text-[#EBF4DD] border border-[#5A7863]/40";

  return (
    <div className="rounded-2xl border border-[#5A7863]/30 bg-[#3B4953] p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#90AB8B]">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: AlertType }) {
  const labels: Record<AlertType, string> = {
    FULL: "Full",
    NEAR_FULL: "Near Full",
    SENSOR_ERROR: "Sensor Error",
    LOW_BATTERY: "Low Battery",
    OFFLINE: "Offline",
  };

  return (
    <span className="inline-flex whitespace-nowrap rounded-full border border-[#90AB8B]/20 bg-[#90AB8B]/10 px-2.5 py-1 text-xs font-medium text-[#90AB8B]">
      {labels[type] || type}
    </span>
  );
}

function LevelBadge({ level }: { level: AlertLevel }) {
  const critical = level === "critical";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        critical
          ? "border-red-400/20 bg-red-400/10 text-red-300"
          : "border-yellow-300/20 bg-yellow-300/10 text-yellow-300"
      }`}
    >
      {critical ? "Critical" : "Warning"}
    </span>
  );
}

function StatusBadge({ active }: { active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        active
          ? "border-yellow-300/20 bg-yellow-300/10 text-yellow-300"
          : "border-[#90AB8B]/20 bg-[#90AB8B]/10 text-[#90AB8B]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-yellow-300" : "bg-[#90AB8B]"
        }`}
      />
      {active ? "Active" : "Resolved"}
    </span>
  );
}

function LineBadge({ sent }: { sent?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        sent
          ? "border-[#90AB8B]/20 bg-[#90AB8B]/10 text-[#90AB8B]"
          : "border-[#5A7863]/30 bg-[#202A30] text-[#90AB8B]/60"
      }`}
    >
      {sent ? "Sent" : "Not Sent"}
    </span>
  );
}

function AlertCard({ alert }: { alert: AlertData }) {
  return (
    <article className="rounded-xl border border-[#5A7863]/30 bg-[#202A30] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#EBF4DD]">
            {alert.binName || alert.binId}
          </p>
          <p className="mt-0.5 font-mono text-xs text-[#90AB8B]">
            {alert.binId}
          </p>
        </div>
        <StatusBadge active={alert.active} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <TypeBadge type={alert.type} />
        <LevelBadge level={alert.level} />
        <LineBadge sent={alert.sentToLine} />
      </div>

      <div className="mt-3 rounded-lg bg-[#3B4953] p-3 text-sm text-[#EBF4DD]">
        {alert.message}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[#90AB8B]">Created</p>
          <p className="mt-0.5 text-[#EBF4DD]">{formatDate(alert.createdAt)}</p>
        </div>
        <div>
          <p className="text-[#90AB8B]">Resolved</p>
          <p className="mt-0.5 text-[#EBF4DD]">
            {formatDate(alert.resolvedAt)}
          </p>
        </div>
      </div>
    </article>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#90AB8B]">
      {children}
    </th>
  );
}

function EmptyAlerts() {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5A7863]/20 text-[#90AB8B]">
        <Check className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[#EBF4DD]">
        No Notifications
      </h3>
      <p className="mt-1 text-sm text-[#90AB8B]">
        ไม่พบการแจ้งเตือนตามเงื่อนไขที่เลือก
      </p>
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-[#5A7863]/20 p-4 sm:p-5">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="flex items-center gap-1 rounded-xl border border-[#5A7863]/40 bg-[#202A30] px-3.5 py-2 text-sm font-medium text-[#EBF4DD] transition hover:bg-[#5A7863] disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
      </button>

      <span className="text-xs text-[#90AB8B] sm:text-sm">
        Page {page} / {Math.max(totalPages, 1)}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        className="flex items-center gap-1 rounded-xl border border-[#5A7863]/40 bg-[#202A30] px-3.5 py-2 text-sm font-medium text-[#EBF4DD] transition hover:bg-[#5A7863] disabled:cursor-not-allowed disabled:opacity-30"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ==================================================
   Skeletons
================================================== */

function TableSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-xl bg-[#202A30]"
        />
      ))}
    </div>
  );
}

function PageSkeleton() {
  return (
    <main className="flex min-h-screen bg-[#202A30]">
      <div className="hidden lg:block lg:w-64" />
      <div className="w-full p-4 pt-20 sm:p-6 lg:p-8">
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-[#3B4953]" />
          <div className="h-8 w-48 animate-pulse rounded-xl bg-[#3B4953]" />
          <div className="h-4 w-64 animate-pulse rounded bg-[#3B4953]" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-[#3B4953]"
            />
          ))}
        </div>
        <div className="mt-6 h-36 animate-pulse rounded-2xl bg-[#3B4953]" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-[#3B4953]" />
      </div>
    </main>
  );
}

/* ==================================================
   Helper Functions
================================================== */

function formatDate(value?: string) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}
