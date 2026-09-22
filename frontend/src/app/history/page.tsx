"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  FileX,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";

import Sidebar from "@/components/layout/Sidebar";
import { useTelemetryHistory } from "@/hooks/useTelemetryHistory";

interface Bin {
  _id?: string;
  id?: string;
  binId: string;
  name: string;
  location: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function HistoryPage() {
  const { data: session, status } = useSession();

  const [bins, setBins] = useState<Bin[]>([]);
  const [selectedBin, setSelectedBin] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [loadingBins, setLoadingBins] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function loadBins() {
      if (!session?.user?.accessToken) {
        setLoadingBins(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/bins`, {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
          cache: "no-store",
        });

        const result = await response.json();

        if (response.ok && result.success) {
          const list = result.data || [];
          setBins(list);

          if (list.length > 0) {
            setSelectedBin(list[0].binId);
          }
        }
      } catch (error) {
        console.error("Load bins error:", error);
      } finally {
        setLoadingBins(false);
      }
    }

    if (status === "authenticated") {
      loadBins();
    }
  }, [status, session]);

  useEffect(() => {
    setPage(1);
  }, [selectedBin, startDate, endDate]);

  const { data, pagination, loading, error } = useTelemetryHistory(
    selectedBin,
    10,
    page,
    startDate,
    endDate,
  );

  async function handleExport() {
    if (!session?.user?.accessToken || !selectedBin) {
      return;
    }

    // 1. ถามยืนยันจากผู้ใช้ก่อน
    const confirmResult = await Swal.fire({
      title: "ต้องการดาวน์โหลด CSV หรือไม่?",
      text: `คุณกำลังจะส่งออกข้อมูล Telemetry ของอุปกรณ์ ${selectedBin}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ดาวน์โหลด",
      cancelButtonText: "ยกเลิก",
      background: "#131822",
      color: "#ffffff",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#212b3d",
      customClass: {
        popup: "rounded-2xl border border-[#212b3d] shadow-2xl",
        confirmButton: "px-5 py-2.5 rounded-xl font-semibold",
        cancelButton:
          "px-5 py-2.5 rounded-xl font-semibold text-slate-300 hover:text-white",
      },
    });

    // ถ้ากด "ยกเลิก" หรือปิด Modal ให้หยุดทำรายการ
    if (!confirmResult.isConfirmed) {
      return;
    }

    // 2. ถ้ากด "ดาวน์โหลด" ค่อยเริ่มกระบวนการ Export
    try {
      setExporting(true);

      const params = new URLSearchParams();
      params.set("binId", selectedBin);

      if (startDate) {
        params.set("startDate", startDate);
      }

      if (endDate) {
        params.set("endDate", endDate);
      }

      const response = await fetch(
        `${API_URL}/api/export/telemetry?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `telemetry-${selectedBin}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => window.URL.revokeObjectURL(url), 100);

      // แสดง Toast แจ้งเตือนเมื่อดาวน์โหลดสำเร็จ
      Swal.fire({
        title: "ส่งออกไฟล์สำเร็จ!",
        text: `ดาวน์โหลด telemetry-${selectedBin}.csv เรียบร้อยแล้ว`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
        background: "#131822",
        color: "#ffffff",
        customClass: {
          popup: "rounded-2xl border border-[#212b3d] shadow-2xl",
        },
      });
    } catch (error) {
      console.error("Export CSV error:", error);

      Swal.fire({
        title: "Export ไม่สำเร็จ!",
        text: "ไม่สามารถส่งออกไฟล์ CSV ได้ กรุณาลองใหม่อีกครั้ง",
        icon: "error",
        background: "#131822",
        color: "#ffffff",
        confirmButtonColor: "#10b981",
        customClass: {
          popup: "rounded-2xl border border-[#212b3d] shadow-2xl",
          confirmButton: "px-5 py-2.5 rounded-xl font-semibold",
        },
      });
    } finally {
      setExporting(false);
    }
  }

  if (status === "loading") {
    return <PageSkeleton />;
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0d14] text-white">
        กรุณาเข้าสู่ระบบ
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0d14] text-white">
      <Sidebar />

      <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8">
        {/* Header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-500">
            Monitoring
          </p>

          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Telemetry History
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            ตรวจสอบข้อมูลย้อนหลังของ Smart Bin
          </p>
        </div>

        {/* Filter Section */}
        <section className="mt-6 rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0a0d14] text-emerald-400 border border-[#212b3d]">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Filter</h2>
              <p className="text-xs text-slate-400">
                ค้นหาและกรอกข้อมูลย้อนหลัง
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Bin */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-400">
                Device
              </label>

              {loadingBins ? (
                <div className="h-[46px] w-full animate-pulse rounded-xl bg-[#0a0d14] border border-[#212b3d]" />
              ) : (
                <select
                  value={selectedBin}
                  disabled={loadingBins}
                  onChange={(event) => setSelectedBin(event.target.value)}
                  className="w-full rounded-xl border border-[#212b3d] bg-[#0a0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                >
                  {bins.length === 0 ? (
                    <option value="">No devices</option>
                  ) : (
                    bins.map((bin) => (
                      <option key={bin.binId} value={bin.binId}>
                        {bin.name} ({bin.binId})
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Start Date */}
            <DateInput
              label="Start Date"
              value={startDate}
              onChange={(value) => setStartDate(value)}
            />

            {/* End Date */}
            <DateInput
              label="End Date"
              value={endDate}
              onChange={(value) => setEndDate(value)}
            />

            {/* Export CSV Button */}
            <div className="flex items-end">
              <button
                onClick={handleExport}
                disabled={exporting || !selectedBin}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#212b3d] bg-[#0a0d14] px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:border-emerald-500/50 hover:bg-[#1a2232] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-emerald-400" />
                    <span>Export CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Reset Filters */}
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setPage(1);
              }}
              className="mt-4 text-xs text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
            >
              Reset date filter
            </button>
          )}
        </section>

        {/* Table Section */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-[#212b3d] bg-[#131822] shadow-xl">
          {/* Table Header */}
          <div className="border-b border-[#212b3d] p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-500 font-medium">
                  Data Records
                </p>

                <h2 className="mt-1 text-xl font-bold text-white">Telemetry</h2>
              </div>

              {pagination && !loading && (
                <span className="text-xs text-slate-400">
                  {pagination.total} records
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="p-8 text-center text-sm text-rose-400">{error}</div>
          ) : data.length === 0 ? (
            <EmptyHistory />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-[#212b3d] bg-[#0a0d14]/60">
                      <TableHead>Time</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Capacitive</TableHead>
                      <TableHead>Inductive</TableHead>
                      <TableHead>Level Sensor</TableHead>
                      <TableHead>Voltage</TableHead>
                      <TableHead>Battery</TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#212b3d]">
                    {data.map((item) => (
                      <tr
                        key={item._id}
                        className="transition hover:bg-[#1a2232]"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-white">
                          {formatDate(item.timestamp)}
                        </td>

                        <td className="px-5 py-4">
                          <LevelCell value={item.level} />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={item.sensorStatus?.capacitive ?? "unknown"}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={item.sensorStatus?.inductive ?? "unknown"}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={item.sensorStatus?.level ?? "unknown"}
                          />
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-white">
                          {item.voltage?.toFixed(1) ?? "--"}
                          <span className="ml-1 text-xs text-slate-400 font-normal">
                            V
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-white">
                          {item.batteryPct ?? "--"}
                          <span className="ml-1 text-xs text-slate-400 font-normal">
                            %
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile hint */}
              <div className="border-t border-[#212b3d] px-5 py-3 text-center text-xs text-slate-400 sm:hidden">
                ← เลื่อนตารางซ้าย-ขวาเพื่อดูข้อมูล →
              </div>

              {/* Pagination */}
              <Pagination
                page={pagination?.page || 1}
                totalPages={pagination?.totalPages || 1}
                hasPrevious={pagination?.hasPreviousPage || false}
                hasNext={pagination?.hasNextPage || false}
                onPrevious={() =>
                  setPage((current) => Math.max(current - 1, 1))
                }
                onNext={() => setPage((current) => current + 1)}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

/* ==================================================
   Date Input
================================================== */
function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-400">
        {label}
      </label>

      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#212b3d] bg-[#0a0d14] px-4 py-3 text-sm text-white outline-none [color-scheme:dark] transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
      />
    </div>
  );
}

/* ==================================================
   Table Head
================================================== */
function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </th>
  );
}

/* ==================================================
   Level Cell
================================================== */
function LevelCell({ value }: { value: number }) {
  return (
    <div className="flex min-w-[110px] items-center gap-3">
      <span className="w-10 font-semibold text-white">{value}%</span>

      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#0a0d14]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400"
          style={{
            width: `${Math.min(Math.max(value, 0), 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ==================================================
   Status Badge
================================================== */
function StatusBadge({ status }: { status: string }) {
  const ok = status === "ok";
  const warning = status === "warning";
  const offline = status === "offline";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        ok
          ? "border-emerald-900 bg-emerald-950/60 text-emerald-400"
          : warning
            ? "border-amber-900 bg-amber-950/60 text-amber-400"
            : offline
              ? "border-slate-800 bg-slate-900/60 text-slate-400"
              : "border-rose-900 bg-rose-950/60 text-rose-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ok
            ? "bg-emerald-400"
            : warning
              ? "bg-amber-400"
              : offline
                ? "bg-slate-400"
                : "bg-rose-400"
        }`}
      />
      {status}
    </span>
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
    <div className="flex items-center justify-between border-t border-[#212b3d] p-4 sm:p-5">
      <button
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#212b3d] bg-[#0a0d14] px-4 py-2 text-sm text-white transition hover:bg-[#1a2232] disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
      </button>

      <span className="text-xs text-slate-400 sm:text-sm">
        Page {page} / {totalPages}
      </span>

      <button
        onClick={onNext}
        disabled={!hasNext}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#212b3d] bg-[#0a0d14] px-4 py-2 text-sm text-white transition hover:bg-[#1a2232] disabled:cursor-not-allowed disabled:opacity-30"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ==================================================
   Empty History State
================================================== */
function EmptyHistory() {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0a0d14] text-slate-400 border border-[#212b3d]">
        <FileX className="h-7 w-7" />
      </div>

      <h3 className="mt-4 font-semibold text-white">No telemetry data</h3>

      <p className="mt-1 text-sm text-slate-400">
        ยังไม่มีข้อมูล Telemetry สำหรับช่วงเวลาที่เลือก
      </p>
    </div>
  );
}

/* ==================================================
   Table Skeleton Loading
================================================== */
function TableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left">
        <thead>
          <tr className="border-b border-[#212b3d] bg-[#0a0d14]/60">
            <TableHead>Time</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Capacitive</TableHead>
            <TableHead>Inductive</TableHead>
            <TableHead>Level Sensor</TableHead>
            <TableHead>Voltage</TableHead>
            <TableHead>Battery</TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#212b3d]">
          {Array.from({ length: 5 }).map((_, index) => (
            <tr key={index}>
              <td className="px-5 py-4">
                <div className="h-4 w-32 animate-pulse rounded bg-[#212b3d]" />
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-8 animate-pulse rounded bg-[#212b3d]" />
                  <div className="h-1.5 w-16 animate-pulse rounded-full bg-[#212b3d]" />
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="h-6 w-16 animate-pulse rounded-full bg-[#212b3d]" />
              </td>
              <td className="px-5 py-4">
                <div className="h-6 w-16 animate-pulse rounded-full bg-[#212b3d]" />
              </td>
              <td className="px-5 py-4">
                <div className="h-6 w-16 animate-pulse rounded-full bg-[#212b3d]" />
              </td>
              <td className="px-5 py-4">
                <div className="h-4 w-12 animate-pulse rounded bg-[#212b3d]" />
              </td>
              <td className="px-5 py-4">
                <div className="h-4 w-12 animate-pulse rounded bg-[#212b3d]" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ==================================================
   Full Page Skeleton Loading
================================================== */
function PageSkeleton() {
  return (
    <main className="flex min-h-screen bg-[#0a0d14]">
      <div className="hidden lg:block lg:w-64" />
      <div className="w-full p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8">
        <div className="space-y-3">
          <div className="h-3 w-20 animate-pulse rounded bg-[#131822]" />
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[#131822]" />
          <div className="h-4 w-64 animate-pulse rounded bg-[#131822]" />
        </div>
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-[#131822] border border-[#212b3d]" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-[#131822] border border-[#212b3d]" />
      </div>
    </main>
  );
}

/* ==================================================
   Date Format
================================================== */
function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}
