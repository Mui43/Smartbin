"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import Sidebar from "@/components/layout/Sidebar";

interface AlertData {
  _id?: string;
  binId: string;
  binName?: string;
  location?: string;
  type:
    | "FULL"
    | "NEAR_FULL"
    | "SENSOR_ERROR"
    | "LOW_BATTERY"
    | "OFFLINE";
  level: "warning" | "critical";
  message: string;
  active?: boolean;
  sentToLine?: boolean;
  createdAt?: string;
  resolvedAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

const alertTypes = [
  { value: "", label: "All Types" },
  { value: "FULL", label: "Full" },
  { value: "NEAR_FULL", label: "Near Full" },
  { value: "SENSOR_ERROR", label: "Sensor Error" },
  { value: "LOW_BATTERY", label: "Low Battery" },
  { value: "OFFLINE", label: "Offline" },
];

export default function NotificationsPage() {
  const { data: session, status } =
    useSession();

  const [alerts, setAlerts] =
    useState<AlertData[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [type, setType] =
    useState("");

  const [active, setActive] =
    useState("");

  const [page, setPage] =
    useState(1);

  async function loadAlerts() {
    if (!session?.user?.accessToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params =
        new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", "20");

      if (type) {
        params.set("type", type);
      }

      if (active !== "") {
        params.set("active", active);
      }

      const response =
        await fetch(
          `${API_URL}/api/alerts/history?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
            },
            cache: "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result?.error?.message ||
            "ไม่สามารถโหลดการแจ้งเตือนได้"
        );

        setAlerts([]);
        setPagination(null);
        return;
      }

      if (result.success) {
        setAlerts(result.data || []);
        setPagination(
          result.pagination
        );
      }
    } catch (error) {
      console.error(
        "Load alerts error:",
        error
      );

      setError(
        "ไม่สามารถเชื่อมต่อ Backend ได้"
      );

      setAlerts([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      status === "authenticated"
    ) {
      loadAlerts();
    }
  }, [
    status,
    session,
    page,
    type,
    active,
  ]);

  useEffect(() => {
    setPage(1);
  }, [type, active]);

  if (status === "loading") {
    return <Loading />;
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#202A30] text-[#EBF4DD]">
        กรุณาเข้าสู่ระบบ
      </main>
    );
  }

  const total =
    pagination?.total || 0;

  const activeCount =
    alerts.filter(
      (alert) => alert.active
    ).length;

  const criticalCount =
    alerts.filter(
      (alert) =>
        alert.level === "critical"
    ).length;

  const lineSentCount =
    alerts.filter(
      (alert) =>
        alert.sentToLine
    ).length;

  return (
    <main className="min-h-screen bg-[#202A30] text-[#EBF4DD]">
      <Sidebar />

      <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8">
        {/* Header */}

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#90AB8B]">
            Monitoring
          </p>

          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            Notifications
          </h1>

          <p className="mt-2 text-sm text-[#90AB8B]">
            ตรวจสอบการแจ้งเตือนและสถานะของ Smart Bin
          </p>
        </div>

        {/* Summary */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Alerts"
            value={total}
            icon="🔔"
          />

          <SummaryCard
            title="Active"
            value={activeCount}
            icon="●"
            accent="green"
          />

          <SummaryCard
            title="Critical"
            value={criticalCount}
            icon="!"
            accent="red"
          />

          <SummaryCard
            title="LINE Sent"
            value={lineSentCount}
            icon="✓"
            accent="green"
          />
        </div>

        {/* Filters */}

        <section className="mt-6 rounded-2xl border border-[#5A7863]/30 bg-[#3B4953] p-5 shadow-xl sm:p-6">
          <div className="flex items-center gap-2">
            <span>🔎</span>

            <h2 className="font-semibold">
              Filter Alerts
            </h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* Type */}

            <div>
              <label className="mb-2 block text-xs font-medium text-[#90AB8B]">
                Alert Type
              </label>

              <select
                value={type}
                onChange={(event) =>
                  setType(
                    event.target.value
                  )
                }
                className="
                  w-full
                  rounded-xl
                  border
                  border-[#5A7863]/40
                  bg-[#202A30]
                  px-4
                  py-3
                  text-sm
                  text-[#EBF4DD]
                  outline-none
                  focus:border-[#90AB8B]
                  focus:ring-2
                  focus:ring-[#90AB8B]/20
                "
              >
                {alertTypes.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Status */}

            <div>
              <label className="mb-2 block text-xs font-medium text-[#90AB8B]">
                Status
              </label>

              <select
                value={active}
                onChange={(event) =>
                  setActive(
                    event.target.value
                  )
                }
                className="
                  w-full
                  rounded-xl
                  border
                  border-[#5A7863]/40
                  bg-[#202A30]
                  px-4
                  py-3
                  text-sm
                  text-[#EBF4DD]
                  outline-none
                  focus:border-[#90AB8B]
                  focus:ring-2
                  focus:ring-[#90AB8B]/20
                "
              >
                <option value="">
                  All Status
                </option>

                <option value="true">
                  Active
                </option>

                <option value="false">
                  Resolved
                </option>
              </select>
            </div>
          </div>

          {(type || active) && (
            <button
              onClick={() => {
                setType("");
                setActive("");
                setPage(1);
              }}
              className="
                mt-4
                text-xs
                text-[#90AB8B]
                underline
                underline-offset-4
                hover:text-[#EBF4DD]
              "
            >
              Reset filters
            </button>
          )}
        </section>

        {/* Error */}

        {error && (
          <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Alerts */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#5A7863]/30 bg-[#3B4953] shadow-xl">
          <div className="border-b border-[#5A7863]/30 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#90AB8B]">
                  Alert History
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Notifications
                </h2>
              </div>

              <button
                onClick={loadAlerts}
                disabled={loading}
                className="
                  rounded-xl
                  border
                  border-[#5A7863]/40
                  bg-[#202A30]
                  px-3
                  py-2
                  text-sm
                  text-[#EBF4DD]
                  transition
                  hover:bg-[#5A7863]
                  disabled:opacity-50
                "
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingRows />
          ) : alerts.length === 0 ? (
            <EmptyAlerts />
          ) : (
            <>
              {/* Desktop Table */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1000px] text-left">
                  <thead>
                    <tr className="border-b border-[#5A7863]/30 bg-[#202A30]/50">
                      <TableHead>
                        Time
                      </TableHead>

                      <TableHead>
                        Device
                      </TableHead>

                      <TableHead>
                        Type
                      </TableHead>

                      <TableHead>
                        Level
                      </TableHead>

                      <TableHead>
                        Message
                      </TableHead>

                      <TableHead>
                        Status
                      </TableHead>

                      <TableHead>
                        LINE
                      </TableHead>

                      <TableHead>
                        Resolved
                      </TableHead>
                    </tr>
                  </thead>

                  <tbody>
                    {alerts.map(
                      (alert) => (
                        <tr
                          key={
                            alert._id ||
                            `${alert.binId}-${alert.createdAt}`
                          }
                          className="
                            border-b
                            border-[#5A7863]/20
                            transition
                            hover:bg-[#5A7863]/10
                          "
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-xs text-[#90AB8B]">
                            {formatDate(
                              alert.createdAt
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-[#EBF4DD]">
                              {alert.binName ||
                                alert.binId}
                            </p>

                            <p className="mt-1 font-mono text-xs text-[#90AB8B]">
                              {alert.binId}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <TypeBadge
                              type={
                                alert.type
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <LevelBadge
                              level={
                                alert.level
                              }
                            />
                          </td>

                          <td className="max-w-[300px] px-5 py-4 text-sm text-[#EBF4DD]">
                            {alert.message}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              active={
                                alert.active
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <LineBadge
                              sent={
                                alert.sentToLine
                              }
                            />
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-xs text-[#90AB8B]">
                            {alert.resolvedAt
                              ? formatDate(
                                  alert.resolvedAt
                                )
                              : "--"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}

              <div className="space-y-4 p-4 md:hidden">
                {alerts.map(
                  (alert) => (
                    <AlertCard
                      key={
                        alert._id ||
                        `${alert.binId}-${alert.createdAt}`
                      }
                      alert={alert}
                    />
                  )
                )}
              </div>

              {/* Pagination */}

              <Pagination
                page={
                  pagination?.page ||
                  1
                }
                totalPages={
                  pagination?.totalPages ||
                  1
                }
                hasPrevious={
                  pagination?.hasPreviousPage ||
                  false
                }
                hasNext={
                  pagination?.hasNextPage ||
                  false
                }
                onPrevious={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        current - 1,
                        1
                      )
                  )
                }
                onNext={() =>
                  setPage(
                    (current) =>
                      current + 1
                  )
                }
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

/* ==================================================
   Summary
================================================== */

function SummaryCard({
  title,
  value,
  icon,
  accent = "normal",
}: {
  title: string;
  value: number;
  icon: string;
  accent?: "normal" | "green" | "red";
}) {
  const iconClass =
    accent === "red"
      ? "bg-red-400/10 text-red-300"
      : "bg-[#5A7863] text-[#EBF4DD]";

  return (
    <div className="rounded-2xl border border-[#5A7863]/30 bg-[#3B4953] p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#90AB8B]">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {value}
          </p>
        </div>

        <div
          className={`
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            font-bold
            ${iconClass}
          `}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ==================================================
   Type Badge
================================================== */

function TypeBadge({
  type,
}: {
  type: AlertData["type"];
}) {
  const labels: Record<
    AlertData["type"],
    string
  > = {
    FULL: "Full",
    NEAR_FULL: "Near Full",
    SENSOR_ERROR: "Sensor Error",
    LOW_BATTERY: "Low Battery",
    OFFLINE: "Offline",
  };

  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-[#90AB8B]/10 px-2.5 py-1 text-xs font-medium text-[#90AB8B]">
      {labels[type]}
    </span>
  );
}

/* ==================================================
   Level Badge
================================================== */

function LevelBadge({
  level,
}: {
  level: "warning" | "critical";
}) {
  const critical =
    level === "critical";

  return (
    <span
      className={`
        inline-flex
        rounded-full
        px-2.5
        py-1
        text-xs
        font-medium
        ${
          critical
            ? "bg-red-400/10 text-red-300"
            : "bg-yellow-300/10 text-yellow-300"
        }
      `}
    >
      {critical
        ? "Critical"
        : "Warning"}
    </span>
  );
}

/* ==================================================
   Status Badge
================================================== */

function StatusBadge({
  active,
}: {
  active?: boolean;
}) {
  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        px-2.5
        py-1
        text-xs
        font-medium
        ${
          active
            ? "bg-yellow-300/10 text-yellow-300"
            : "bg-[#90AB8B]/10 text-[#90AB8B]"
        }
      `}
    >
      <span
        className={`
          h-1.5
          w-1.5
          rounded-full
          ${
            active
              ? "bg-yellow-300"
              : "bg-[#90AB8B]"
          }
        `}
      />

      {active
        ? "Active"
        : "Resolved"}
    </span>
  );
}

/* ==================================================
   LINE Badge
================================================== */

function LineBadge({
  sent,
}: {
  sent?: boolean;
}) {
  return (
    <span
      className={`
        inline-flex
        rounded-full
        px-2.5
        py-1
        text-xs
        font-medium
        ${
          sent
            ? "bg-[#90AB8B]/10 text-[#90AB8B]"
            : "bg-[#202A30] text-[#90AB8B]/60"
        }
      `}
    >
      {sent ? "Sent" : "Not Sent"}
    </span>
  );
}

/* ==================================================
   Mobile Alert Card
================================================== */

function AlertCard({
  alert,
}: {
  alert: AlertData;
}) {
  return (
    <article className="rounded-xl border border-[#5A7863]/30 bg-[#202A30] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#EBF4DD]">
            {alert.binName ||
              alert.binId}
          </p>

          <p className="mt-1 font-mono text-xs text-[#90AB8B]">
            {alert.binId}
          </p>
        </div>

        <StatusBadge
          active={alert.active}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <TypeBadge
          type={alert.type}
        />

        <LevelBadge
          level={alert.level}
        />

        <LineBadge
          sent={alert.sentToLine}
        />
      </div>

      <div className="mt-4 rounded-lg bg-[#3B4953] p-3">
        <p className="text-sm leading-6 text-[#EBF4DD]">
          {alert.message}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[#90AB8B]">
            Created
          </p>

          <p className="mt-1 text-[#EBF4DD]">
            {formatDate(
              alert.createdAt
            )}
          </p>
        </div>

        <div>
          <p className="text-[#90AB8B]">
            Resolved
          </p>

          <p className="mt-1 text-[#EBF4DD]">
            {alert.resolvedAt
              ? formatDate(
                  alert.resolvedAt
                )
              : "--"}
          </p>
        </div>
      </div>
    </article>
  );
}

/* ==================================================
   Table Head
================================================== */

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#90AB8B]">
      {children}
    </th>
  );
}

/* ==================================================
   Pagination
================================================== */

function Pagination({
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
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="
          rounded-xl
          border
          border-[#5A7863]/40
          bg-[#202A30]
          px-3
          py-2
          text-sm
          text-[#EBF4DD]
          transition
          hover:bg-[#5A7863]
          disabled:cursor-not-allowed
          disabled:opacity-30
          sm:px-4
        "
      >
        ← Previous
      </button>

      <span className="text-xs text-[#90AB8B] sm:text-sm">
        Page {page} /{" "}
        {totalPages}
      </span>

      <button
        onClick={onNext}
        disabled={!hasNext}
        className="
          rounded-xl
          border
          border-[#5A7863]/40
          bg-[#202A30]
          px-3
          py-2
          text-sm
          text-[#EBF4DD]
          transition
          hover:bg-[#5A7863]
          disabled:cursor-not-allowed
          disabled:opacity-30
          sm:px-4
        "
      >
        Next →
      </button>
    </div>
  );
}

/* ==================================================
   Empty
================================================== */

function EmptyAlerts() {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5A7863] text-2xl">
        ✓
      </div>

      <h3 className="mt-5 font-semibold">
        No notifications
      </h3>

      <p className="mt-2 text-sm text-[#90AB8B]">
        ไม่พบการแจ้งเตือนตามเงื่อนไขที่เลือก
      </p>
    </div>
  );
}

/* ==================================================
   Loading
================================================== */

function LoadingRows() {
  return (
    <div className="space-y-3 p-5">
      {[1, 2, 3, 4, 5].map(
        (item) => (
          <div
            key={item}
            className="h-16 animate-pulse rounded-xl bg-[#202A30]"
          />
        )
      )}
    </div>
  );
}

/* ==================================================
   Date
================================================== */

function formatDate(
  value?: string
) {
  if (!value) {
    return "--";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "--";
  }

  return date.toLocaleString(
    "th-TH",
    {
      dateStyle: "short",
      timeStyle: "medium",
    }
  );
}

/* ==================================================
   Loading
================================================== */

function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#202A30]">
      <div className="text-center text-[#90AB8B]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#5A7863] border-t-[#EBF4DD]" />

        <p className="mt-4 text-sm">
          Loading...
        </p>
      </div>
    </main>
  );
}