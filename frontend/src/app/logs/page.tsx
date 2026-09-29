"use client";
import { apiFetch } from "@/lib/apiFetch";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  RotateCcw,
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
  Filter,
  Download,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import PaginationControls from "@/components/ui/PaginationControls";
import Swal from "sweetalert2";

const actionLabels: Record<string, string> = {
  LOGIN: "เข้าสู่ระบบ",
  LOGIN_FAILED: "เข้าสู่ระบบไม่สำเร็จ",
  CREATE_BIN: "เพิ่มถังขยะ",
  UPDATE_BIN: "แก้ไขถังขยะ",
  DELETE_BIN: "ลบถังขยะ",
  LOCK: "ส่งคำสั่งล็อก",
  UNLOCK: "ส่งคำสั่งปลดล็อก",
  UPDATE_SETTINGS: "แก้ไขการตั้งค่า",
  TEST_LINE: "ทดสอบ LINE",
};

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
    | "UNLOCK"
    | "UPDATE_SETTINGS"
    | "TEST_LINE";
  binId?: string;
  binName?: string;
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // State สำหรับเปิด/ปิด Filter Panel
  const [showFilters, setShowFilters] = useState(false);

  const [exporting, setExporting] = useState(false);
  const accessToken = session?.user?.accessToken;
  const invalidRange = Boolean(startDate && endDate && startDate > endDate);

  // นับจำนวน Filter ที่กำลังใช้งานอยู่ (ไม่รวม Bin ID)
  const activeFiltersCount =
    (action ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0);

  function filterParams() {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (binId.trim()) params.set("binId", binId.trim());
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params;
  }

  async function exportLogs() {
    if (!accessToken || invalidRange) return;
    setExporting(true);
    try {
      const response = await apiFetch(
        `${API_URL}/api/logs/export?${filterParams()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) throw new Error("ไม่สามารถส่งออก Logs ได้");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "audit-logs.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "ไม่สามารถส่งออก Logs ได้",
      );
    } finally {
      setExporting(false);
    }
  }

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  async function loadLogs() {
    if (!accessToken || session?.user.role !== "admin") return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const controller = abortControllerRef.current;
    if (invalidRange) {
      setError("วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด");
      setLogs([]);
      setPagination(null);
      setLoading(false);
      setIsInitialLoad(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = filterParams();
      params.set("page", String(page));
      params.set("limit", "20");

      const response = await apiFetch(`${API_URL}/api/logs?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        signal: controller.signal,
      });

      const result = await response.json();
      if (controller.signal.aborted) return;

      if (!response.ok || !result.success) {
        setLogs([]);
        setPagination(null);
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
      if (!controller.signal.aborted) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadLogs();
    }
    return () => abortControllerRef.current?.abort();
  }, [
    status,
    accessToken,
    session?.user.role,
    page,
    action,
    binId,
    startDate,
    endDate,
  ]);

  function resetFilter() {
    setAction("");
    setBinId("");
    setStartDate("");
    setEndDate("");
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
          <h1 className="mt-4 text-xl font-bold text-white">
            ไม่มีสิทธิ์เข้าถึง
          </h1>
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

      <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Page Header */}
          <div>
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
              ประวัติการใช้งานและการทำงานของระบบย้อนหลัง • เวลาประเทศไทย (UTC+7)
            </p>
          </div>

          <Header hideTitle />
        </div>

        {/* Clean Filter Section */}
        <div className="mb-6 space-y-3">
          {/* Top Bar: Search & Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Primary Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={binId}
                onChange={(e) => {
                  setBinId(e.target.value);
                  setPage(1);
                }}
                placeholder="ค้นหาด้วย Bin ID เช่น A-001..."
                className="h-12 w-full rounded-2xl border border-[#212b3d] bg-[#131822] py-2 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex h-12 items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition ${
                  showFilters || activeFiltersCount > 0
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-[#212b3d] bg-[#131822] text-slate-300 hover:bg-[#212b3d]"
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>ตัวกรอง</span>
                {activeFiltersCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <button
                onClick={loadLogs}
                disabled={loading || invalidRange}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#212b3d] bg-[#131822] text-slate-300 transition hover:bg-[#212b3d] disabled:opacity-40"
                title="รีเฟรชข้อมูล"
              >
                <RotateCcw
                  className={`h-4 w-4 ${loading && !isInitialLoad ? "animate-spin" : ""}`}
                />
              </button>

              <button
                onClick={exportLogs}
                disabled={
                  exporting || invalidRange || loading || logs.length === 0
                }
                className="flex h-12 items-center gap-2 rounded-2xl border border-[#212b3d] bg-[#131822] px-4 text-sm font-medium text-slate-300 transition hover:bg-[#212b3d] hover:text-white disabled:opacity-40"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>

          {/* Expandable Advanced Filters */}
          {showFilters && (
            <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                {/* Action Select */}
                <div className="md:col-span-1">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
                    Action
                  </label>
                  <select
                    value={action}
                    onChange={(e) => {
                      setAction(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-[#212b3d] bg-[#0a0d14] p-2.5 text-sm text-white outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">ทุกเหตุการณ์</option>
                    {Object.entries(actionLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div className="md:col-span-1">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
                    ตั้งแต่วันที่
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-[#212b3d] bg-[#0a0d14] p-2.5 text-sm text-white [color-scheme:dark] outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* End Date */}
                <div className="md:col-span-1">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
                    ถึงวันที่
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-[#212b3d] bg-[#0a0d14] p-2.5 text-sm text-white [color-scheme:dark] outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Reset Button */}
                <div className="flex items-end md:col-span-1">
                  <button
                    type="button"
                    onClick={resetFilter}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>ล้างตัวกรองทั้งหมด</span>
                  </button>
                </div>
              </div>
            </div>
          )}
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
                          <span>เวลา (UTC+7)</span>
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
                      <th className="px-5 py-4 font-semibold">สถานะ</th>
                      <th className="px-5 py-4 font-semibold">ถังขยะ</th>
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
                        <td className="px-5 py-4">
                          <OutcomeBadge log={log} />
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-300">
                          {log.binId ? (
                            <span className="rounded-lg border border-[#212b3d] bg-[#0a0d14] px-2.5 py-1 text-xs">
                              {log.binId}
                              {log.binName && (
                                <span className="ml-2 font-sans">
                                  {log.binName}
                                </span>
                              )}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-400">
                          {log.ip || "-"}
                        </td>
                        <td className="max-w-xs px-5 py-4 text-xs text-slate-400">
                          <button
                            onClick={() =>
                              void Swal.fire({
                                title: actionLabels[log.action] || log.action,
                                text: `${formatDate(log.timestamp)}\nผู้ดำเนินการ: ${log.email || "ระบบ"}\nถัง: ${log.binName || log.binId || "—"}\nIP: ${log.ip || "—"}\nอุปกรณ์ผู้ใช้: ${log.userAgent || "—"}\n\n${detailText(log.details)}`,
                                confirmButtonText: "ปิด",
                                background: "#131822",
                                color: "#fff",
                                customClass: {
                                  htmlContainer:
                                    "!whitespace-pre-wrap !text-left !text-sm",
                                },
                              })
                            }
                            className="rounded-lg border border-[#212b3d] px-3 py-2 text-slate-300 transition hover:bg-[#212b3d]"
                          >
                            ดูรายละเอียด
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-[#212b3d] px-4 py-2.5 text-center text-xs text-slate-500 lg:hidden">
                ← เลื่อนตารางซ้าย-ขวาเพื่อดูข้อมูลเพิ่ม →
              </div>

            </>
          )}
          {pagination && (
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              disabled={loading}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    </main>
  );
}

/* ==================================================
   Sub Components & UI Badges
================================================== */
function OutcomeBadge({ log }: { log: AuditLog }) {
  const failed =
    log.action === "LOGIN_FAILED" || log.details?.success === false;
  const command = log.action === "LOCK" || log.action === "UNLOCK";
  const label = failed ? "ล้มเหลว" : command ? "ส่งคำสั่งแล้ว" : "สำเร็จ";
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${failed ? "bg-rose-500/10 text-rose-400" : command ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}
    >
      {label}
    </span>
  );
}

function detailText(details?: Record<string, unknown>) {
  if (!details) return "ไม่มีรายละเอียดเพิ่มเติม";
  const labels: Record<string, string> = {
    name: "ชื่อถัง",
    location: "สถานที่",
    mqttTopic: "MQTT Topic",
    thresholdPct: "เกณฑ์ใกล้เต็ม (%)",
    reason: "สาเหตุ",
    message: "ข้อความ",
    action: "คำสั่ง",
  };
  const reasons: Record<string, string> = {
    USER_NOT_FOUND: "ไม่พบผู้ใช้",
    USER_INACTIVE: "บัญชีถูกระงับ",
    INVALID_PASSWORD: "รหัสผ่านไม่ถูกต้อง",
  };
  const show = (value: unknown) =>
    typeof value === "string"
      ? reasons[value] || value
      : (JSON.stringify(value) ?? "—");
  if (
    details.before &&
    details.after &&
    typeof details.before === "object" &&
    typeof details.after === "object"
  ) {
    const before = details.before as Record<string, unknown>;
    return Object.entries(details.after)
      .map(
        ([key, value]) =>
          `${labels[key] || key}: ${show(before[key])} → ${show(value)}`,
      )
      .join("\n");
  }
  return Object.entries(details)
    .map(([key, value]) => `${labels[key] || key}: ${show(value)}`)
    .join("\n");
}

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
    case "UPDATE_SETTINGS":
      colorStyle = "bg-amber-500/10 text-amber-400 border-amber-500/30";
      Icon = Edit;
      break;
    case "TEST_LINE":
      colorStyle = "bg-sky-500/10 text-sky-400 border-sky-500/30";
      Icon = Activity;
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${colorStyle}`}
    >
      <Icon className="h-3 w-3" />
      <span title={action}>{actionLabels[action] || action}</span>
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
      <div className="w-full p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8">
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
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
