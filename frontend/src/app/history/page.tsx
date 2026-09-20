"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

import {
  useTelemetryHistory,
} from "@/hooks/useTelemetryHistory";

interface Bin {
  _id: string;
  binId: string;
  name: string;
  location: string;
}

export default function HistoryPage() {
  const { data: session, status } = useSession();

  const [bins, setBins] = useState<Bin[]>([]);
  const [selectedBin, setSelectedBin] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [page, setPage] = useState(1);

  const [binsLoading, setBinsLoading] =
    useState(true);

  const [binsError, setBinsError] =
    useState("");

  useEffect(() => {
    async function loadBins() {
      if (!session?.user?.accessToken) {
        setBinsLoading(false);
        return;
      }

      setBinsLoading(true);
      setBinsError("");

      try {
        const response = await fetch(
          "http://localhost:4000/api/bins",
          {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
            },
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          setBinsError(
            result?.error?.message ||
            "ไม่สามารถโหลดรายการถังได้"
          );
          return;
        }

        if (result.success) {
          setBins(result.data);

          if (result.data.length > 0) {
            setSelectedBin(
              result.data[0].binId
            );
          }
        }
      } catch (error) {
        console.error(
          "Load bins error:",
          error
        );

        setBinsError(
          "ไม่สามารถเชื่อมต่อ Backend ได้"
        );
      } finally {
        setBinsLoading(false);
      }
    }

    loadBins();
  }, [session]);

  const [exporting, setExporting] =
    useState(false);

  async function handleExportCsv() {
    if (!session?.user?.accessToken) {
      alert("กรุณาเข้าสู่ระบบ");
      return;
    }

    if (!selectedBin) {
      alert("กรุณาเลือก Bin");
      return;
    }

    try {
      setExporting(true);

      const params = new URLSearchParams();

      params.set(
        "binId",
        selectedBin
      );

      if (startDate) {
        params.set(
          "startDate",
          startDate
        );
      }

      if (endDate) {
        params.set(
          "endDate",
          endDate
        );
      }

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
        const result =
          await response.json();

        throw new Error(
          result?.error?.message ||
          "Export CSV failed"
        );
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `telemetry-${selectedBin}.csv`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (error) {
      console.error(
        "CSV export error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "ไม่สามารถ Export CSV ได้"
      );
    } finally {
      setExporting(false);
    }
  }

  function handleBinChange(
    value: string
  ) {
    setSelectedBin(value);
    setPage(1);
  }

  function handleStartDateChange(
    value: string
  ) {
    setStartDate(value);
    setPage(1);
  }

  function handleEndDateChange(
    value: string
  ) {
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

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Telemetry History
          </h1>
          <button
            onClick={handleExportCsv}
            disabled={
              exporting || !selectedBin
            }
            className="rounded-lg bg-[#0A21C0] px-5 py-3 text-sm font-medium transition hover:bg-[#050A44] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting
              ? "กำลัง Export..."
              : "📥 Export CSV"}
          </button>

          <p className="mt-2 text-gray-400">
            ดูข้อมูลการทำงานของถังย้อนหลัง
          </p>
        </div>

        {/* Filter */}
        <div className="mb-6 rounded-xl bg-[#2C2E3A] p-5">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Bin */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Bin
              </label>

              <select
                value={selectedBin}
                onChange={(e) =>
                  handleBinChange(
                    e.target.value
                  )
                }
                disabled={
                  binsLoading ||
                  bins.length === 0
                }
                className="w-full rounded-lg bg-[#141619] p-3 text-white outline-none disabled:opacity-50"
              >
                {bins.length === 0 ? (
                  <option value="">
                    ไม่มีข้อมูลถัง
                  </option>
                ) : (
                  bins.map((bin) => (
                    <option
                      key={bin.binId}
                      value={bin.binId}
                    >
                      {bin.binId} - {bin.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                วันที่เริ่มต้น
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  handleStartDateChange(
                    e.target.value
                  )
                }
                className="w-full rounded-lg bg-[#141619] p-3 text-white outline-none"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                วันที่สิ้นสุด
              </label>

              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) =>
                  handleEndDateChange(
                    e.target.value
                  )
                }
                className="w-full rounded-lg bg-[#141619] p-3 text-white outline-none"
              />
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
          <div className="rounded-xl bg-[#2C2E3A] p-8 text-center text-gray-400">
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
  setPage: React.Dispatch<
    React.SetStateAction<number>
  >;
  startDate: string;
  endDate: string;
}) {
  const {
    data,
    pagination,
    loading,
    error,
  } = useTelemetryHistory(
    binId,
    10,
    page,
    startDate,
    endDate
  );

  return (
    <div className="overflow-hidden rounded-xl bg-[#2C2E3A]">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px]">
          <thead className="bg-[#050A44]">
            <tr>
              <th className="px-4 py-4 text-left">
                Time
              </th>

              <th className="px-4 py-4 text-left">
                Level
              </th>

              <th className="px-4 py-4 text-left">
                Capacitive
              </th>

              <th className="px-4 py-4 text-left">
                Inductive
              </th>

              <th className="px-4 py-4 text-left">
                Level Sensor
              </th>

              <th className="px-4 py-4 text-left">
                Voltage
              </th>

              <th className="px-4 py-4 text-left">
                Battery
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-red-400"
                >
                  {error}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-gray-400"
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
                    {new Date(
                      item.timestamp
                    ).toLocaleString(
                      "th-TH"
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <LevelBadge
                      level={item.level}
                    />
                  </td>

                  <td className="px-4 py-4">
                    <StatusBadge
                      status={
                        item.sensorStatus
                          .capacitive
                      }
                    />
                  </td>

                  <td className="px-4 py-4">
                    <StatusBadge
                      status={
                        item.sensorStatus
                          .inductive
                      }
                    />
                  </td>

                  <td className="px-4 py-4">
                    <StatusBadge
                      status={
                        item.sensorStatus
                          .level
                      }
                    />
                  </td>

                  <td className="px-4 py-4">
                    {item.voltage.toFixed(1)} V
                  </td>

                  <td className="px-4 py-4">
                    {item.batteryPct}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-col gap-4 border-t border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-400">
            หน้า {pagination.page} /{" "}
            {Math.max(
              pagination.totalPages,
              1
            )}{" "}
            • ทั้งหมด {pagination.total} รายการ
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={
                !pagination.hasPreviousPage
              }
              onClick={() =>
                setPage((current) =>
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
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
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

function LevelBadge({
  level,
}: {
  level: number;
}) {
  let className =
    "bg-green-500/10 text-green-400";

  if (level >= 85) {
    className =
      "bg-red-500/10 text-red-400";
  } else if (level >= 70) {
    className =
      "bg-yellow-500/10 text-yellow-400";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {level}%
    </span>
  );
}