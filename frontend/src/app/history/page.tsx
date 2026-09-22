"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

import { useTelemetryHistory } from "@/hooks/useTelemetryHistory";

// 1. ย้าย Swal Mixin มาไว้ด้านนอกเพื่อให้ทุกส่วนเรียกใช้สีเดียวกันได้
const darkSwal = Swal.mixin({
  background: "#3b4953", // --card
  color: "#ebf4dd", // --text
  confirmButtonColor: "#5a7863", // --accent
  cancelButtonColor: "#202a30", // --bg
  customClass: {
    popup: "border border-[#5a7863]/30 rounded-2xl",
  },
});

interface Bin {
  _id: string;
  binId: string;
  name: string;
  location: string;
}

export default function HistoryPage() {
  const { data: session, status } = useSession();

  const [bins, setBins] = useState<Bin[]>([]);
  const [selectedBin, setSelectedBin] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [binsLoading, setBinsLoading] = useState(true);
  const [binsError, setBinsError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function loadBins() {
      if (!session?.user?.accessToken) {
        setBinsLoading(false);
        return;
      }

      setBinsLoading(true);
      setBinsError("");

      try {
        const response = await fetch("http://localhost:4000/api/bins", {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          setBinsError(result?.error?.message || "ไม่สามารถโหลดรายการถังได้");
          return;
        }

        if (result.success) {
          setBins(result.data);

          if (result.data.length > 0) {
            setSelectedBin(result.data[0].binId);
          }
        }
      } catch (error) {
        console.error("Load bins error:", error);
        setBinsError("ไม่สามารถเชื่อมต่อ Backend ได้");
      } finally {
        setBinsLoading(false);
      }
    }

    loadBins();
  }, [session]);

  async function handleExportCsv() {
    if (!session?.user?.accessToken) {
      darkSwal.fire({
        icon: "warning",
        title: "กรุณาเข้าสู่ระบบ",
        text: "เซสชันของคุณหมดอายุหรือยังไม่ได้เข้าสู่ระบบ",
      });
      return;
    }

    if (!selectedBin) {
      darkSwal.fire({
        icon: "info",
        title: "กรุณาเลือก Bin",
        text: "โปรดเลือกถังขยะที่ต้องการส่งออกข้อมูล",
      });
      return;
    }

    // 1. ถามยืนยันผู้ใช้ก่อนดาวน์โหลด (Confirmation Dialog)
    const result = await darkSwal.fire({
      title: "ยืนยันการส่งออกข้อมูล?",
      text: `คุณต้องการดาวน์โหลดไฟล์ CSV ของถัง ${selectedBin} หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ดาวน์โหลด",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    try {
      setExporting(true);

      // 2. แสดงสถานะกำลังดาวน์โหลด (Loading Indicator)
      darkSwal.fire({
        title: "กำลังเตรียมไฟล์...",
        text: "กรุณารอสักครู่ ระบบกำลังประมวลผลข้อมูล",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const params = new URLSearchParams();
      params.set("binId", selectedBin);

      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(
        `http://localhost:4000/api/export/telemetry?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const resultData = await response.json();
        throw new Error(resultData?.error?.message || "Export CSV failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `telemetry-${selectedBin}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // 3. แสดงข้อความสำเร็จเมื่อดาวน์โหลดเสร็จสมบูรณ์
      darkSwal.fire({
        icon: "success",
        title: "ดาวน์โหลดสำเร็จ!",
        text: "ไฟล์ CSV ถูกบันทึกลงในเครื่องของคุณแล้ว",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("CSV export error:", error);

      // 4. แสดงข้อความแจ้งเตือนเมื่อเกิดข้อผิดพลาด
      darkSwal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text:
          error instanceof Error ? error.message : "ไม่สามารถ Export CSV ได้",
      });
    } finally {
      setExporting(false);
    }
  }

  function handleBinChange(value: string) {
    setSelectedBin(value);
    setPage(1);
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    setPage(1);
  }

  function handleEndDateChange(value: string) {
    setEndDate(value);
    setPage(1);
  }

  function resetFilter() {
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[var(--bg)] p-8 text-[var(--text)]">
        กำลังตรวจสอบ Session...
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-screen bg-[var(--bg)] p-8 text-[var(--text)]">
        <div className="rounded-xl bg-[var(--card)] p-6">กรุณาเข้าสู่ระบบ</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <div className="ml-64 p-8">
        <Header />

        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Telemetry History</h1>
            <p className="mt-2 text-[var(--secondary)]">
              ดูข้อมูลการทำงานของถังย้อนหลัง
            </p>
          </div>

          <div>
            <button
              onClick={handleExportCsv}
              disabled={exporting || !selectedBin}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[var(--text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลัง Export...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export CSV
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6 rounded-xl bg-[var(--card)] p-5">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Bin */}
            <div>
              <label className="mb-2 block text-sm text-[var(--secondary)]">
                Bin
              </label>

              <select
                value={selectedBin}
                onChange={(e) => handleBinChange(e.target.value)}
                disabled={binsLoading || bins.length === 0}
                className="w-full rounded-lg border border-white/5 bg-[var(--bg)] p-3 text-[var(--text)] outline-none disabled:opacity-50"
              >
                {bins.length === 0 ? (
                  <option value="">ไม่มีข้อมูลถัง</option>
                ) : (
                  bins.map((bin) => (
                    <option key={bin.binId} value={bin.binId}>
                      {bin.binId} - {bin.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="mb-2 block text-sm text-[var(--secondary)]">
                วันที่เริ่มต้น
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-[var(--bg)] p-3 text-[var(--text)] outline-none"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="mb-2 block text-sm text-[var(--secondary)]">
                วันที่สิ้นสุด
              </label>

              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-[var(--bg)] p-3 text-[var(--text)] outline-none"
              />
            </div>

            {/* Reset */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilter}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--bg)] p-3 font-semibold text-[var(--text)] transition hover:bg-[var(--accent)]/20"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Filter
              </button>
            </div>
          </div>

          {binsError && (
            <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {binsError}
            </div>
          )}
        </div>

        {/* History Table */}
        {selectedBin ? (
          <HistoryTable
            binId={selectedBin}
            page={page}
            setPage={setPage}
            startDate={startDate}
            endDate={endDate}
          />
        ) : (
          <div className="rounded-xl bg-[var(--card)] p-8 text-center text-[var(--secondary)]">
            ไม่พบ Bin สำหรับแสดงข้อมูล
          </div>
        )}
      </div>
    </main>
  );
}

function HistoryTable({
  binId,
  page,
  setPage,
  startDate,
  endDate,
}: {
  binId: string;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  startDate: string;
  endDate: string;
}) {
  const { data, pagination, loading, error } = useTelemetryHistory(
    binId,
    10,
    page,
    startDate,
    endDate
  );

  return (
    <div className="overflow-hidden rounded-xl bg-[var(--card)]">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px]">
          <thead className="bg-[var(--bg)]/50">
            <tr>
              <th className="px-4 py-4 text-left">Time</th>
              <th className="px-4 py-4 text-left">Level</th>
              <th className="px-4 py-4 text-left">Capacitive</th>
              <th className="px-4 py-4 text-left">Inductive</th>
              <th className="px-4 py-4 text-left">Level Sensor</th>
              <th className="px-4 py-4 text-left">Voltage</th>
              <th className="px-4 py-4 text-left">Battery</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <TableSkeleton />
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-red-400">
                  {error}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-[var(--secondary)]"
                >
                  ไม่พบข้อมูล Telemetry
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item._id}
                  className="border-t border-white/5 hover:bg-white/5"
                >
                  <td className="whitespace-nowrap px-4 py-4 text-sm">
                    {new Date(item.timestamp).toLocaleString("th-TH")}
                  </td>

                  <td className="px-4 py-4">
                    <LevelBadge level={item.level} />
                  </td>

                  <td className="px-4 py-4">
                    <StatusBadge status={item.sensorStatus.capacitive} />
                  </td>

                  <td className="px-4 py-4">
                    <StatusBadge status={item.sensorStatus.inductive} />
                  </td>

                  <td className="px-4 py-4">
                    <StatusBadge status={item.sensorStatus.level} />
                  </td>

                  <td className="px-4 py-4">{item.voltage.toFixed(1)} V</td>

                  <td className="px-4 py-4">{item.batteryPct}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && !loading && (
        <div className="flex flex-col gap-4 border-t border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--secondary)]">
            หน้า {pagination.page} / {Math.max(pagination.totalPages, 1)} •
            ทั้งหมด {pagination.total} รายการ
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!pagination.hasPreviousPage}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg)] px-4 py-2 text-sm transition hover:bg-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
            </button>

            <button
              type="button"
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg)] px-4 py-2 text-sm transition hover:bg-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ถัดไป <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   Table Skeleton Component
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
          {/* Level */}
          <td className="px-4 py-4">
            <div className="h-6 w-12 rounded-full bg-white/10" />
          </td>
          {/* Capacitive */}
          <td className="px-4 py-4">
            <div className="h-6 w-16 rounded-full bg-white/10" />
          </td>
          {/* Inductive */}
          <td className="px-4 py-4">
            <div className="h-6 w-16 rounded-full bg-white/10" />
          </td>
          {/* Level Sensor */}
          <td className="px-4 py-4">
            <div className="h-6 w-16 rounded-full bg-white/10" />
          </td>
          {/* Voltage */}
          <td className="px-4 py-4">
            <div className="h-4 w-12 rounded bg-white/10" />
          </td>
          {/* Battery */}
          <td className="px-4 py-4">
            <div className="h-4 w-10 rounded bg-white/10" />
          </td>
        </tr>
      ))}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "ok"
      ? "bg-green-500/10 text-green-400"
      : status === "warning"
        ? "bg-yellow-500/10 text-yellow-400"
        : status === "offline"
          ? "bg-gray-500/10 text-gray-400"
          : "bg-red-500/10 text-red-400";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {status.toUpperCase()}
    </span>
  );
}

function LevelBadge({ level }: { level: number }) {
  let className = "bg-green-500/10 text-green-400";

  if (level >= 85) {
    className = "bg-red-500/10 text-red-400";
  } else if (level >= 70) {
    className = "bg-yellow-500/10 text-yellow-400";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {level}%
    </span>
  );
}