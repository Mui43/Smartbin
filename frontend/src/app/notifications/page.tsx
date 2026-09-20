"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

type AlertType =
  | "FULL"
  | "NEAR_FULL"
  | "SENSOR_ERROR"
  | "LOW_BATTERY"
  | "OFFLINE";

interface AlertItem {
  _id: string;

  binId: string;

  type: AlertType;

  level: "warning" | "critical";

  message: string;

  active: boolean;

  sentToLine: boolean;

  createdAt: string;

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

export default function NotificationsPage() {
  const { data: session, status } =
    useSession();

  const [alerts, setAlerts] =
    useState<AlertItem[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [page, setPage] = useState(1);

  const [type, setType] =
    useState("");

  const [alertStatus, setAlertStatus] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadAlerts() {
    if (!session?.user?.accessToken) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params =
        new URLSearchParams();

      params.set(
        "page",
        String(page)
      );

      params.set("limit", "20");

      if (type) {
        params.set("type", type);
      }

      if (alertStatus) {
        params.set(
          "active",
          alertStatus
        );
      }

      const response = await fetch(
        `http://localhost:4000/api/alerts/history?${params.toString()}`,
        {
          method: "GET",
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
            "ไม่สามารถโหลดประวัติแจ้งเตือนได้"
        );

        setAlerts([]);
        setPagination(null);

        return;
      }

      if (result.success) {
        setAlerts(result.data);

        setPagination(
          result.pagination
        );
      }
    } catch (error) {
      console.error(
        "Load notifications error:",
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
    if (status === "authenticated") {
      loadAlerts();
    }
  }, [
    status,
    session,
    page,
    type,
    alertStatus,
  ]);

  function resetFilter() {
    setType("");
    setAlertStatus("");
    setPage(1);
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#141619] p-8 text-white">
        กำลังตรวจสอบ Session...
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-screen bg-[#141619] p-8 text-white">
        <div className="rounded-xl bg-[#2C2E3A] p-6">
          กรุณาเข้าสู่ระบบ
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#141619] text-white">
      <Sidebar />

      <div className="ml-64 p-8">
        <Header />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Notifications
          </h1>

          <p className="mt-2 text-gray-400">
            ประวัติการแจ้งเตือนของ Smart Bin
          </p>
        </div>

        {/* Filter */}
        <div className="mb-6 rounded-xl bg-[#2C2E3A] p-5">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Type */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Alert Type
              </label>

              <select
                value={type}
                onChange={(e) => {
                  setType(
                    e.target.value
                  );
                  setPage(1);
                }}
                className="w-full rounded-lg bg-[#141619] p-3 text-white outline-none"
              >
                <option value="">
                  All Types
                </option>

                <option value="FULL">
                  FULL
                </option>

                <option value="NEAR_FULL">
                  NEAR_FULL
                </option>

                <option value="SENSOR_ERROR">
                  SENSOR_ERROR
                </option>

                <option value="LOW_BATTERY">
                  LOW_BATTERY
                </option>

                <option value="OFFLINE">
                  OFFLINE
                </option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Status
              </label>

              <select
                value={alertStatus}
                onChange={(e) => {
                  setAlertStatus(
                    e.target.value
                  );
                  setPage(1);
                }}
                className="w-full rounded-lg bg-[#141619] p-3 text-white outline-none"
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

            {/* Reset */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilter}
                className="w-full rounded-lg bg-[#050A44] p-3 font-semibold transition hover:bg-[#0A21C0]"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Alert Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Total"
            value={
              pagination?.total || 0
            }
            icon="🔔"
          />

          <SummaryCard
            title="Active"
            value={
              alerts.filter(
                (alert) =>
                  alert.active
              ).length
            }
            icon="⚠️"
          />

          <SummaryCard
            title="LINE Sent"
            value={
              alerts.filter(
                (alert) =>
                  alert.sentToLine
              ).length
            }
            icon="📱"
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-[#2C2E3A]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-[#050A44]">
                <tr>
                  <th className="px-4 py-4 text-left">
                    Time
                  </th>

                  <th className="px-4 py-4 text-left">
                    Bin
                  </th>

                  <th className="px-4 py-4 text-left">
                    Type
                  </th>

                  <th className="px-4 py-4 text-left">
                    Level
                  </th>

                  <th className="px-4 py-4 text-left">
                    Message
                  </th>

                  <th className="px-4 py-4 text-left">
                    Status
                  </th>

                  <th className="px-4 py-4 text-left">
                    LINE
                  </th>

                  <th className="px-4 py-4 text-left">
                    Resolved
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-gray-400"
                    >
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : alerts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-gray-400"
                    >
                      ไม่พบข้อมูลการแจ้งเตือน
                    </td>
                  </tr>
                ) : (
                  alerts.map(
                    (alert) => (
                      <tr
                        key={alert._id}
                        className="border-t border-white/5 hover:bg-white/5"
                      >
                        {/* Time */}
                        <td className="whitespace-nowrap px-4 py-4 text-sm">
                          {formatDate(
                            alert.createdAt
                          )}
                        </td>

                        {/* Bin */}
                        <td className="px-4 py-4 font-medium">
                          {alert.binId}
                        </td>

                        {/* Type */}
                        <td className="px-4 py-4">
                          <TypeBadge
                            type={
                              alert.type
                            }
                          />
                        </td>

                        {/* Level */}
                        <td className="px-4 py-4">
                          <LevelBadge
                            level={
                              alert.level
                            }
                          />
                        </td>

                        {/* Message */}
                        <td className="max-w-xs px-4 py-4 text-sm">
                          {alert.message}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          {alert.active ? (
                            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                              Resolved
                            </span>
                          )}
                        </td>

                        {/* LINE */}
                        <td className="px-4 py-4">
                          {alert.sentToLine ? (
                            <span className="text-green-400">
                              ✓ Sent
                            </span>
                          ) : (
                            <span className="text-gray-500">
                              —
                            </span>
                          )}
                        </td>

                        {/* Resolved */}
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-400">
                          {alert.resolvedAt
                            ? formatDate(
                                alert.resolvedAt
                              )
                            : "-"}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && (
            <div className="flex flex-col gap-4 border-t border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-400">
                หน้า{" "}
                {pagination.page}{" "}
                /{" "}
                {Math.max(
                  pagination.totalPages,
                  1
                )}{" "}
                • ทั้งหมด{" "}
                {pagination.total}{" "}
                รายการ
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={
                    !pagination.hasPreviousPage
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          current - 1,
                          1
                        )
                    )
                  }
                  className="rounded-lg bg-[#141619] px-4 py-2 text-sm transition hover:bg-[#050A44] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ← ก่อนหน้า
                </button>

                <button
                  type="button"
                  disabled={
                    !pagination.hasNextPage
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        current + 1
                    )
                  }
                  className="rounded-lg bg-[#141619] px-4 py-2 text-sm transition hover:bg-[#050A44] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ถัดไป →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-xl bg-[#2C2E3A] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {title}
        </p>

        <span className="text-xl">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function TypeBadge({
  type,
}: {
  type: AlertType;
}) {
  const className =
    type === "FULL"
      ? "bg-red-500/10 text-red-400"
      : type === "NEAR_FULL"
      ? "bg-yellow-500/10 text-yellow-400"
      : type === "SENSOR_ERROR"
      ? "bg-red-500/10 text-red-400"
      : type === "LOW_BATTERY"
      ? "bg-yellow-500/10 text-yellow-400"
      : "bg-gray-500/10 text-gray-400";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {type}
    </span>
  );
}

function LevelBadge({
  level,
}: {
  level: "warning" | "critical";
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        level === "critical"
          ? "bg-red-500/10 text-red-400"
          : "bg-yellow-500/10 text-yellow-400"
      }`}
    >
      {level.toUpperCase()}
    </span>
  );
}

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleString("th-TH");
}