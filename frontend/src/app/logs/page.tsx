"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface AuditLog {
  _id: string;
  userId?: string;
  email?: string;
  role?: "admin" | "staff" | "viewer";
  action:
    | "LOGIN"
    | "LOGIN_FAILED"
    | "CREATE_BIN"
    | "UPDATE_BIN"
    | "DELETE_BIN"
    | "LOCK"
    | "UNLOCK";
  binId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function LogsPage() {
  const { data: session, status } = useSession();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [binId, setBinId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLogs() {
    if (!session?.user?.accessToken) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", "20");

      if (action) {
        params.set("action", action);
      }

      if (binId) {
        params.set("binId", binId);
      }

      const response = await fetch(
        `http://localhost:4000/api/logs?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message || "ไม่สามารถโหลด Audit Logs ได้");
        setLogs([]);
        setPagination(null);
        return;
      }

      if (result.success) {
        setLogs(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error("Load audit logs error:", error);
      setError("ไม่สามารถเชื่อมต่อ Backend ได้");
      setLogs([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadLogs();
    }
  }, [status, session, page, action, binId]);

  function resetFilter() {
    setAction("");
    setBinId("");
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
        <div className="rounded-xl bg-[#2C2E3A] p-6">กรุณาเข้าสู่ระบบ</div>
      </main>
    );
  }

  if (session.user.role !== "admin") {
    return (
      <main className="min-h-screen bg-[#141619] p-8 text-white">
        <div className="rounded-xl bg-[#2C2E3A] p-6">
          <h1 className="text-xl font-bold">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="mt-2 text-gray-400">หน้านี้สำหรับ Admin เท่านั้น</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#141619] text-white">
      <Sidebar />

      <div className="ml-64 p-8">
        <Header />

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="mt-2 text-gray-400">
            ประวัติการใช้งานและการทำงานของระบบ
          </p>
        </div>

        {/* Filter */}
        <div className="mb-6 rounded-xl bg-[#2C2E3A] p-5 border border-white/5">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Action */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">Action</label>
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg bg-[#141619] p-3 text-white outline-none border border-white/5"
              >
                <option value="">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="CREATE_BIN">CREATE_BIN</option>
                <option value="UPDATE_BIN">UPDATE_BIN</option>
                <option value="DELETE_BIN">DELETE_BIN</option>
                <option value="LOCK">LOCK</option>
                <option value="UNLOCK">UNLOCK</option>
              </select>
            </div>

            {/* Bin ID */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">Bin ID</label>
              <input
                type="text"
                value={binId}
                onChange={(e) => {
                  setBinId(e.target.value);
                  setPage(1);
                }}
                placeholder="เช่น A-001"
                className="w-full rounded-lg bg-[#141619] p-3 text-white outline-none border border-white/5 placeholder:text-gray-600"
              />
            </div>

            {/* Reset */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilter}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#050A44] p-3 font-semibold transition hover:bg-[#0A21C0]"
              >
                <RotateCcw className="h-4 w-4" />
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

        {/* Logs Table */}
        <div className="overflow-hidden rounded-xl bg-[#2C2E3A] border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-[#050A44]">
                <tr>
                  <th className="px-4 py-4 text-left">Time</th>
                  <th className="px-4 py-4 text-left">User</th>
                  <th className="px-4 py-4 text-left">Role</th>
                  <th className="px-4 py-4 text-left">Action</th>
                  <th className="px-4 py-4 text-left">Bin</th>
                  <th className="px-4 py-4 text-left">IP</th>
                  <th className="px-4 py-4 text-left">Details</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-gray-400"
                    >
                      ไม่พบข้อมูล Logs
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log._id}
                      className="border-t border-white/5 hover:bg-white/5"
                    >
                      {/* Time */}
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        {new Date(log.timestamp).toLocaleString("th-TH")}
                      </td>

                      {/* User */}
                      <td className="px-4 py-4">{log.email || "-"}</td>

                      {/* Role */}
                      <td className="px-4 py-4">
                        <RoleBadge role={log.role} />
                      </td>

                      {/* Action */}
                      <td className="px-4 py-4">
                        <ActionBadge action={log.action} />
                      </td>

                      {/* Bin */}
                      <td className="px-4 py-4">{log.binId || "-"}</td>

                      {/* IP */}
                      <td className="px-4 py-4 text-sm text-gray-400">
                        {log.ip || "-"}
                      </td>

                      {/* Details */}
                      <td className="max-w-sm px-4 py-4 text-sm text-gray-400">
                        <div className="break-words">
                          {log.details ? JSON.stringify(log.details) : "-"}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && !loading && (
            <div className="flex flex-col gap-4 border-t border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-400">
                หน้า {pagination.page} / {Math.max(pagination.totalPages, 1)} •
                ทั้งหมด {pagination.total} รายการ
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#141619] px-4 py-2 text-sm transition hover:bg-[#050A44] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
                </button>

                <button
                  type="button"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#141619] px-4 py-2 text-sm transition hover:bg-[#050A44] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ถัดไป <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* =========================
   Skeleton Component
========================= */

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="animate-pulse border-t border-white/5">
          {/* Time */}
          <td className="px-4 py-4">
            <div className="h-4 w-32 rounded bg-white/10" />
          </td>
          {/* User */}
          <td className="px-4 py-4">
            <div className="h-4 w-40 rounded bg-white/10" />
          </td>
          {/* Role */}
          <td className="px-4 py-4">
            <div className="h-6 w-16 rounded-full bg-white/10" />
          </td>
          {/* Action */}
          <td className="px-4 py-4">
            <div className="h-6 w-24 rounded-full bg-white/10" />
          </td>
          {/* Bin */}
          <td className="px-4 py-4">
            <div className="h-4 w-12 rounded bg-white/10" />
          </td>
          {/* IP */}
          <td className="px-4 py-4">
            <div className="h-4 w-28 rounded bg-white/10" />
          </td>
          {/* Details */}
          <td className="px-4 py-4">
            <div className="h-4 w-48 rounded bg-white/10" />
          </td>
        </tr>
      ))}
    </>
  );
}

/* =========================
   Helper Components
========================= */

function RoleBadge({ role }: { role?: string }) {
  return (
    <span className="rounded-full bg-[#050A44] px-3 py-1 text-xs font-semibold">
      {role || "-"}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  const isDanger = action === "LOGIN_FAILED" || action === "DELETE_BIN";
  const isLock = action === "LOCK";
  const isUnlock = action === "UNLOCK";

  let className = "bg-gray-500/10 text-gray-300";

  if (isDanger) {
    className = "bg-red-500/10 text-red-400";
  } else if (isLock) {
    className = "bg-yellow-500/10 text-yellow-400";
  } else if (isUnlock) {
    className = "bg-green-500/10 text-green-400";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {action}
    </span>
  );
}