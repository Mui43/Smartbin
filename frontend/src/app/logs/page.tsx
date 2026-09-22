"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FileText,
  ShieldAlert,
  Clock,
  User,
  Shield,
  Activity,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  PlusCircle,
  Edit,
  Loader2,
} from "lucide-react";

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

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LogsPage() {
  const { data: session, status } = useSession();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [binId, setBinId] = useState("");

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  async function loadLogs() {
    if (!session?.user?.accessToken) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (action) params.set("action", action);
      if (binId) params.set("binId", binId);

      const response = await fetch(`${API_URL}/api/logs?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
        },
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message || "ไม่สามารถโหลด Audit Logs ได้");
        return;
      }

      if (result.success) {
        setLogs(result.data);
        setPagination(result.pagination);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Load audit logs error:", err);
      setError("ไม่สามารถเชื่อมต่อ Backend ได้");
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
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
    return <PageSkeleton />;
  }

  if (status !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0d14] p-4 text-white">
        <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-6 text-center shadow-2xl">
          <p className="text-slate-400">กรุณาเข้าสู่ระบบ</p>
        </div>
      </main>
    );
  }

  if (session.user.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0d14] p-4 text-white">
        <div className="max-w-md rounded-2xl border border-rose-900/40 bg-[#131822] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-900/50 bg-rose-950/30 text-rose-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-white">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="mt-2 text-sm text-slate-400">
            หน้านี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0d14] text-white">
      <Sidebar />

      <div className="p-4 pt-20 sm:p-6 lg:ml-64 lg:p-8">
        <Header />

        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
              System Operations
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            ประวัติการใช้งานและการทำงานของระบบย้อนหลัง
          </p>
        </div>

        {/* Filter Section */}
        <div className="mb-6 rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {/* Action Select */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Action
              </label>
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[#212b3d] bg-[#0a0d14] p-3 text-sm text-white outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
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

            {/* Bin ID Input */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Bin ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={binId}
                  onChange={(e) => {
                    setBinId(e.target.value);
                    setPage(1);
                  }}
                  placeholder="เช่น A-001"
                  className="w-full rounded-xl border border-[#212b3d] bg-[#0a0d14] py-3 pl-10 pr-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                />
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            {/* Reset Button */}
            <div className="flex items-end sm:col-span-2 md:col-span-1">
              <button
                type="button"
                onClick={resetFilter}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#212b3d] bg-[#0a0d14] p-3 text-sm font-semibold text-slate-300 transition hover:bg-[#212b3d] hover:text-white active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset Filter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-900/50 bg-rose-950/40 p-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Logs Table Container */}
        <div className="relative overflow-hidden rounded-2xl border border-[#212b3d] bg-[#131822] shadow-2xl">
          {isInitialLoad && loading ? (
            <TableSkeleton />
          ) : logs.length === 0 ? (
            <EmptyLogs />
          ) : (
            <>
              {/* Overlay Loading Indicator */}
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0d14]/50 backdrop-blur-[2px] transition-opacity">
                  <div className="flex items-center gap-2.5 rounded-xl border border-[#212b3d] bg-[#131822] px-4 py-2.5 text-sm font-medium text-white shadow-2xl">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    <span>กำลังอัปเดตข้อมูล...</span>
                  </div>
                </div>
              )}

              <div
                className={`overflow-x-auto transition-opacity duration-200 ${
                  loading ? "opacity-40" : "opacity-100"
                }`}
              >
                <table className="w-full min-w-[1000px] text-left">
                  <thead>
                    <tr className="border-b border-[#212b3d] bg-[#0a0d14]/80 text-xs uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-4 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>Time</span>
                        </div>
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                          <span>User</span>
                        </div>
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-slate-500" />
                          <span>Role</span>
                        </div>
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-slate-500" />
                          <span>Action</span>
                        </div>
                      </th>
                      <th className="px-5 py-4 font-semibold">Bin</th>
                      <th className="px-5 py-4 font-semibold">IP Address</th>
                      <th className="px-5 py-4 font-semibold">Details</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#212b3d]/60 text-sm">
                    {logs.map((log) => (
                      <tr
                        key={log._id}
                        className="transition hover:bg-[#212b3d]/30"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-slate-300">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="px-5 py-4 font-medium text-white">
                          {log.email || "-"}
                        </td>
                        <td className="px-5 py-4">
                          <RoleBadge role={log.role} />
                        </td>
                        <td className="px-5 py-4">
                          <ActionBadge action={log.action} />
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-300">
                          {log.binId ? (
                            <span className="rounded-lg border border-[#212b3d] bg-[#0a0d14] px-2.5 py-1 text-xs">
                              {log.binId}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-400">
                          {log.ip || "-"}
                        </td>
                        <td className="max-w-xs px-5 py-4 text-xs text-slate-400">
                          <div className="max-h-16 overflow-y-auto break-words font-mono text-[11px] text-slate-400">
                            {log.details ? JSON.stringify(log.details) : "-"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-[#212b3d] px-4 py-2.5 text-center text-xs text-slate-500 lg:hidden">
                ← เลื่อนตารางซ้าย-ขวาเพื่อดูข้อมูลเพิ่ม →
              </div>

              {pagination && (
                <div className="flex flex-col gap-4 border-t border-[#212b3d] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-400 sm:text-sm">
                    หน้า {pagination.page} /{" "}
                    {Math.max(pagination.totalPages, 1)}
                    <span className="mx-2 text-slate-600">•</span>
                    ทั้งหมด {pagination.total} รายการ
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!pagination.hasPreviousPage || loading}
                      onClick={() =>
                        setPage((current) => Math.max(current - 1, 1))
                      }
                      className="inline-flex items-center gap-1 rounded-xl border border-[#212b3d] bg-[#0a0d14] px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-[#212b3d] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:text-sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>ก่อนหน้า</span>
                    </button>

                    <button
                      type="button"
                      disabled={!pagination.hasNextPage || loading}
                      onClick={() => setPage((current) => current + 1)}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#212b3d] bg-[#0a0d14] px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-[#212b3d] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:text-sm"
                    >
                      <span>ถัดไป</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/* ==================================================
   Sub Components & UI Badges
================================================== */

function RoleBadge({ role }: { role?: string }) {
  if (!role) return <span className="text-slate-500">-</span>;

  const isAdmin = role === "admin";
  const isStaff = role === "staff";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
        isAdmin
          ? "border border-purple-500/30 bg-purple-500/10 text-purple-400"
          : isStaff
            ? "border border-blue-500/30 bg-blue-500/10 text-blue-400"
            : "border border-slate-700 bg-slate-800 text-slate-400"
      }`}
    >
      {role}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  let colorStyle = "bg-slate-800 text-slate-300 border-slate-700";
  let Icon = Activity;

  switch (action) {
    case "LOGIN":
      colorStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      Icon = KeyRound;
      break;
    case "LOGIN_FAILED":
      colorStyle = "bg-rose-500/10 text-rose-400 border-rose-500/30";
      Icon = ShieldAlert;
      break;
    case "CREATE_BIN":
      colorStyle = "bg-sky-500/10 text-sky-400 border-sky-500/30";
      Icon = PlusCircle;
      break;
    case "UPDATE_BIN":
      colorStyle = "bg-amber-500/10 text-amber-400 border-amber-500/30";
      Icon = Edit;
      break;
    case "DELETE_BIN":
      colorStyle = "bg-rose-500/10 text-rose-400 border-rose-500/30";
      Icon = Trash2;
      break;
    case "LOCK":
      colorStyle = "bg-orange-500/10 text-orange-400 border-orange-500/30";
      Icon = Lock;
      break;
    case "UNLOCK":
      colorStyle = "bg-teal-500/10 text-teal-400 border-teal-500/30";
      Icon = Unlock;
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${colorStyle}`}
    >
      <Icon className="h-3 w-3" />
      <span>{action}</span>
    </span>
  );
}

function EmptyLogs() {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#212b3d] bg-[#0a0d14] text-slate-500">
        <FileText className="h-7 w-7" />
      </div>
      <h3 className="mt-4 font-semibold text-white">ไม่พบข้อมูล Logs</h3>
      <p className="mt-1 text-sm text-slate-400">
        ไม่มีรายการ Audit Logs ตามเงื่อนไขที่เลือกค้นหา
      </p>
    </div>
  );
}

/* ==================================================
   Skeleton Loaders
================================================== */

function TableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px]">
        <thead>
          <tr className="border-b border-[#212b3d] bg-[#0a0d14]/80 text-xs uppercase tracking-wider text-slate-400">
            <th className="px-5 py-4 font-semibold">Time</th>
            <th className="px-5 py-4 font-semibold">User</th>
            <th className="px-5 py-4 font-semibold">Role</th>
            <th className="px-5 py-4 font-semibold">Action</th>
            <th className="px-5 py-4 font-semibold">Bin</th>
            <th className="px-5 py-4 font-semibold">IP Address</th>
            <th className="px-5 py-4 font-semibold">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#212b3d]/60">
          {Array.from({ length: 6 }).map((_, index) => (
            <tr key={index}>
              <td className="px-5 py-4">
                <div className="h-4 w-28 animate-pulse rounded-lg bg-[#212b3d]" />
              </td>
              <td className="px-5 py-4">
                <div className="h-4 w-36 animate-pulse rounded-lg bg-[#212b3d]" />
              </td>
              <td className="px-5 py-4">
                <div className="h-5 w-16 animate-pulse rounded-full bg-[#212b3d]" />
              </td>
              <td className="px-5 py-4">
                <div className="h-6 w-24 animate-pulse rounded-full bg-[#212b3d]" />
              </td>
              <td className="px-5 py-4">
                <div className="h-4 w-12 animate-pulse rounded-lg bg-[#212b3d]" />
              </td>
              <td className="px-5 py-4">
                <div className="h-4 w-24 animate-pulse rounded-lg bg-[#212b3d]" />
              </td>
              <td className="px-5 py-4">
                <div className="h-4 w-32 animate-pulse rounded-lg bg-[#212b3d]" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PageSkeleton() {
  return (
    <main className="flex min-h-screen bg-[#0a0d14]">
      <div className="hidden lg:block lg:w-64" />
      <div className="w-full p-4 pt-20 sm:p-6 lg:p-8">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-[#131822]" />
          <div className="h-4 w-64 animate-pulse rounded-lg bg-[#131822]" />
        </div>
        <div className="mt-6 h-28 animate-pulse rounded-2xl bg-[#131822]" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-[#131822]" />
      </div>
    </main>
  );
}

/* ==================================================
   Helper Functions
================================================== */

function formatDate(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}