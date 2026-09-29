"use client";
import { apiFetch } from "@/lib/apiFetch";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  Download,
  FileX,
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  X,
  Check,
  RotateCcw,
  Filter,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";

import Sidebar from "@/components/layout/Sidebar";
import PaginationControls from "@/components/ui/PaginationControls";
import { useTelemetryHistory } from "@/hooks/useTelemetryHistory";

interface Bin {
  _id?: string;
  id?: string;
  binId: string;
  name: string;
  location?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function HistoryPage() {
  const { data: session, status } = useSession();

  // State สำหรับ Bin Selector
  const [bins, setBins] = useState<Bin[]>([]);
  const [selectedBin, setSelectedBin] = useState("");
  const [loadingBins, setLoadingBins] = useState(true);
  const [binsError, setBinsError] = useState("");

  // State สำหรับ Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // State Active Filters (ใช้ส่งค่าเข้าไปโหลด Telemetry)
  const [activeStartDate, setActiveStartDate] = useState("");
  const [activeEndDate, setActiveEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const accessToken = session?.user?.accessToken;
  const invalidRange = Boolean(startDate && endDate && startDate > endDate);

  // โหลดรายการถังขยะ
  useEffect(() => {
    const controller = new AbortController();

    async function loadBins() {
      if (!accessToken) {
        setLoadingBins(false);
        return;
      }

      try {
        setBinsError("");
        const response = await apiFetch(`${API_URL}/api/bins`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
          signal: controller.signal,
        });

        const result = await response.json();
        if (controller.signal.aborted) return;

        if (!response.ok || !result.success) {
          throw new Error(
            result?.error?.message || "ไม่สามารถโหลดรายการถังได้",
          );
        }

        const list = result.data || [];
        setBins(list);

        if (list.length > 0) {
          setSelectedBin(list[0].binId);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setBinsError(
          error instanceof Error ? error.message : "ไม่สามารถโหลดรายการถังได้",
        );
      } finally {
        if (!controller.signal.aborted) setLoadingBins(false);
      }
    }

    if (status === "authenticated") {
      loadBins();
    }

    return () => controller.abort();
  }, [status, accessToken]);

  // โหลดข้อมูล Telemetry
  const { data, pagination, loading, error, reload } = useTelemetryHistory(
    selectedBin,
    10,
    page,
    activeStartDate,
    activeEndDate,
  );

  // กรองข้อมูลด้วยคำค้นหา (Client-side Search Filter)
  const filteredData = data.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const statusCap = item.sensorStatus?.capacitive?.toLowerCase() || "";
    const statusInd = item.sensorStatus?.inductive?.toLowerCase() || "";
    const statusLvl = item.sensorStatus?.level?.toLowerCase() || "";

    return (
      selectedBin.toLowerCase().includes(query) ||
      item.level?.toString().includes(query) ||
      item.voltage?.toString().includes(query) ||
      item.batteryPct?.toString().includes(query) ||
      statusCap.includes(query) ||
      statusInd.includes(query) ||
      statusLvl.includes(query)
    );
  });

  // ปุ่มกด Filter
  const handleApplyFilter = () => {
    if (invalidRange) return;
    setPage(1);
    setActiveStartDate(startDate);
    setActiveEndDate(endDate);
  };

  // ปุ่มรีเซ็ต (Reset Filter)
  const handleResetFilter = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setActiveStartDate("");
    setActiveEndDate("");
    setPage(1);
  };

  // Export CSV
  async function handleExport() {
    if (!accessToken || !selectedBin || invalidRange) return;

    const confirmResult = await Swal.fire({
      title: "ดาวน์โหลด CSV หรือไม่?",
      text: `ส่งออกข้อมูล Telemetry ของอุปกรณ์ ${selectedBin}`,
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

    if (!confirmResult.isConfirmed) return;

    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.set("binId", selectedBin);
      if (activeStartDate) params.set("startDate", activeStartDate);
      if (activeEndDate) params.set("endDate", activeEndDate);

      const response = await apiFetch(
        `${API_URL}/api/export/telemetry?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `telemetry-${selectedBin}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);

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
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Export ไม่สำเร็จ!",
        text: "ไม่สามารถส่งออกไฟล์ CSV ได้ กรุณาลองใหม่อีกครั้ง",
        icon: "error",
        background: "#131822",
        color: "#ffffff",
        confirmButtonColor: "#10b981",
      });
    } finally {
      setExporting(false);
    }
  }

  if (status === "loading") return <PageSkeleton />;
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

      <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-500">
            Monitoring
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Telemetry History
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            ตรวจสอบและเรียกดูข้อมูลย้อนหลัง Smart Bin • เวลาประเทศไทย (UTC+7)
          </p>
        </div>

        {/* ================= 1. BIN SELECTOR CARD ================= */}
        <section className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0a0d14] text-emerald-400 border border-[#212b3d]">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  เลือกถังขยะ / อุปกรณ์
                </h2>
                <p className="text-xs text-slate-400">
                  เลือกถังขยะที่ต้องการดูข้อมูลประวัติย้อนหลัง
                </p>
              </div>
            </div>

            <div className="w-full sm:w-80">
              {loadingBins ? (
                <div className="h-[46px] w-full animate-pulse rounded-xl bg-[#0a0d14] border border-[#212b3d]" />
              ) : (
                <SearchableBinSelect
                  bins={bins}
                  selectedBin={selectedBin}
                  onSelect={(binId) => {
                    setPage(1);
                    setSelectedBin(binId);
                  }}
                />
              )}
            </div>
          </div>
          {binsError && (
            <p className="mt-2 text-xs text-rose-400">{binsError}</p>
          )}
        </section>

        {/* ================= 2. TOOLBAR BAR (แถบการค้นหาแบบแนวนอน) ================= */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input Field */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาด้วย Bin ID เช่น A-001..."
                className="w-full rounded-2xl border border-[#212b3d] bg-[#131822] py-2.5 pl-11 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilterPanel((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-2xl border border-[#212b3d] bg-[#131822] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-[#1a2232] active:scale-[0.98] ${
                showFilterPanel || activeStartDate || activeEndDate
                  ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                  : ""
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>ตัวกรอง</span>
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetFilter}
              title="รีเซ็ตการค้นหา"
              className="inline-flex items-center justify-center rounded-2xl border border-[#212b3d] bg-[#131822] p-2.5 text-slate-300 transition hover:bg-[#1a2232] hover:text-white active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || !selectedBin || invalidRange}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#212b3d] bg-[#131822] px-4 py-2.5 text-sm font-medium text-white transition hover:border-emerald-500/50 hover:bg-[#1a2232] active:scale-[0.98] disabled:opacity-40"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              ) : (
                <Download className="h-4 w-4 text-emerald-400" />
              )}
              <span>Export CSV</span>
            </button>
          </div>

          {/* Expandable Date Range Panel (จะเปิดเมื่อคลิกปุ่มตัวกรอง) */}
          {showFilterPanel && (
            <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-4 shadow-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-[#212b3d] bg-[#0a0d14] px-3 py-2 text-sm text-white outline-none [color-scheme:dark] transition focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-[#212b3d] bg-[#0a0d14] px-3 py-2 text-sm text-white outline-none [color-scheme:dark] transition focus:border-emerald-500/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyFilter}
                  disabled={invalidRange || loading}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  ค้นหาช่วงเวลา
                </button>
              </div>

              {invalidRange && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-400">
                  <AlertCircle size={14} />{" "}
                  วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด
                </p>
              )}
            </div>
          )}
        </section>

        {/* ================= 3. TABLE DATA SECTION ================= */}
        <section className="overflow-hidden rounded-2xl border border-[#212b3d] bg-[#131822] shadow-xl">
          <div className="border-b border-[#212b3d] p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-500 font-medium">
                  Data Records
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">Telemetry</h2>
              </div>

              <div className="flex items-center gap-3">
                {pagination && !loading && (
                  <span className="text-xs text-slate-400">
                    แสดง {filteredData.length} จาก {pagination.total} รายการ
                  </span>
                )}
                <button
                  type="button"
                  onClick={reload}
                  disabled={loading || !selectedBin}
                  className="flex items-center gap-2 rounded-lg border border-[#212b3d] bg-[#0a0d14] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-[#1a2232] disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={loading ? "animate-spin" : ""}
                  />
                  รีเฟรช
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="p-8 text-center text-sm text-rose-400">{error}</div>
          ) : filteredData.length === 0 ? (
            <EmptyHistory />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-[#212b3d] bg-[#0a0d14]/60">
                      <TableHead>Time (UTC+7)</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Capacitive</TableHead>
                      <TableHead>Inductive</TableHead>
                      <TableHead>Level Sensor</TableHead>
                      <TableHead>Voltage</TableHead>
                      <TableHead>Battery</TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#212b3d]">
                    {filteredData.map((item, index) => (
                      <tr
                        key={item._id ?? index}
                        className="transition hover:bg-[#1a2232]"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-white">
                          {formatDate(item.timestamp)}
                        </td>
                        <td className="px-5 py-4">
                          <LevelCell value={item.level ?? 0} />
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
                          {item.voltage != null
                            ? item.voltage.toFixed(1)
                            : "--"}
                          <span className="ml-1 text-xs font-normal text-slate-400">
                            V
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-white">
                          {item.batteryPct ?? "--"}
                          <span className="ml-1 text-xs font-normal text-slate-400">
                            %
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </>
          )}
          {!loading && !error && pagination && (
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              totalItems={pagination.total}
            />
          )}
        </section>
      </div>
    </main>
  );
}

/* ==================================================
   Searchable Bin Select Dropdown
================================================== */
function SearchableBinSelect({
  bins,
  selectedBin,
  onSelect,
}: {
  bins: Bin[];
  selectedBin: string;
  onSelect: (binId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentBin = bins.find((b) => b.binId === selectedBin);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredBins = bins.filter((bin) => {
    const term = searchTerm.toLowerCase();
    return (
      bin.name?.toLowerCase().includes(term) ||
      bin.binId?.toLowerCase().includes(term) ||
      bin.location?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-[46px] w-full items-center justify-between rounded-xl border border-[#212b3d] bg-[#0a0d14] px-4 text-left text-sm text-white transition focus:border-emerald-500/50"
      >
        <span className="truncate">
          {currentBin
            ? `${currentBin.name} (${currentBin.binId})`
            : "เลือกถังขยะ..."}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-xl border border-[#212b3d] bg-[#131822] p-2 shadow-2xl backdrop-blur-xl">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="พิมพ์ชื่อ หรือ Bin ID..."
              className="w-full rounded-lg border border-[#212b3d] bg-[#0a0d14] py-2 pl-8 pr-8 text-xs text-white outline-none focus:border-emerald-500/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-[#212b3d]/50">
            {filteredBins.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                ไม่พบถังขยะ
              </div>
            ) : (
              filteredBins.map((bin) => {
                const isSelected = bin.binId === selectedBin;
                return (
                  <button
                    key={bin.binId}
                    type="button"
                    onClick={() => {
                      onSelect(bin.binId);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`flex w-full items-center justify-between p-2.5 text-left text-xs transition rounded-lg ${
                      isSelected
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-slate-200 hover:bg-[#1a2232]"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-white">{bin.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {bin.binId} {bin.location ? `• ${bin.location}` : ""}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-emerald-400" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================================================
   Helper UI Components
================================================== */
function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </th>
  );
}

function LevelCell({ value }: { value: number }) {
  const safeVal = Math.min(Math.max(value, 0), 100);
  return (
    <div className="flex min-w-[110px] items-center gap-3">
      <span className="w-10 font-semibold text-white">{safeVal}%</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#0a0d14]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400"
          style={{ width: `${safeVal}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === "ok";
  const warning = status === "warning";
  const error = status === "error";
  const labels: Record<string, string> = {
    ok: "ทำงานปกติ",
    warning: "ควรตรวจสอบ",
    error: "ขัดข้อง",
    offline: "ไม่เชื่อมต่อ",
    unknown: "ไม่ทราบสถานะ",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        ok
          ? "border-emerald-900 bg-emerald-950/60 text-emerald-400"
          : warning
            ? "border-amber-900 bg-amber-950/60 text-amber-400"
            : error
              ? "border-rose-900 bg-rose-950/60 text-rose-400"
              : "border-slate-800 bg-slate-900/60 text-slate-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ok
            ? "bg-emerald-400"
            : warning
              ? "bg-amber-400"
              : error
                ? "bg-rose-400"
                : "bg-slate-400"
        }`}
      />
      {labels[status] ?? labels.unknown}
    </span>
  );
}

function EmptyHistory() {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0a0d14] text-slate-400 border border-[#212b3d]">
        <FileX className="h-7 w-7" />
      </div>
      <h3 className="mt-4 font-semibold text-white">No telemetry data</h3>
      <p className="mt-1 text-sm text-slate-400">
        ไม่พบข้อมูล Telemetry ตามเงื่อนไขที่เลือก
      </p>
    </div>
  );
}

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
          {Array.from({ length: 5 }).map((_, idx) => (
            <tr key={idx}>
              <td className="px-5 py-4">
                <div className="h-4 w-32 animate-pulse rounded bg-[#212b3d]" />
              </td>
              <td className="px-5 py-4">
                <div className="h-4 w-16 animate-pulse rounded bg-[#212b3d]" />
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

function PageSkeleton() {
  return (
    <main className="flex min-h-screen bg-[#0a0d14]">
      <div className="hidden lg:block lg:w-64" />
      <div className="w-full p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#131822]" />
        <div className="h-20 animate-pulse rounded-2xl bg-[#131822] border border-[#212b3d]" />
        <div className="h-24 animate-pulse rounded-2xl bg-[#131822] border border-[#212b3d]" />
        <div className="h-80 animate-pulse rounded-2xl bg-[#131822] border border-[#212b3d]" />
      </div>
    </main>
  );
}

function formatDate(value: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "medium",
  });
}
