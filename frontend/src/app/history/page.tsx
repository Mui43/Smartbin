"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import Sidebar from "@/components/layout/Sidebar";
import { useTelemetryHistory } from "@/hooks/useTelemetryHistory";

interface Bin {
  _id?: string;
  id?: string;
  binId: string;
  name: string;
  location: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

export default function HistoryPage() {
  const { data: session, status } =
    useSession();

  const [bins, setBins] =
    useState<Bin[]>([]);

  const [selectedBin, setSelectedBin] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [loadingBins, setLoadingBins] =
    useState(true);

  const [exporting, setExporting] =
    useState(false);

  useEffect(() => {
    async function loadBins() {
      if (!session?.user?.accessToken) {
        setLoadingBins(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/bins`,
          {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
            },
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (
          response.ok &&
          result.success
        ) {
          const list =
            result.data || [];

          setBins(list);

          if (list.length > 0) {
            setSelectedBin(
              list[0].binId
            );
          }
        }
      } catch (error) {
        console.error(
          "Load bins error:",
          error
        );
      } finally {
        setLoadingBins(false);
      }
    }

    if (
      status === "authenticated"
    ) {
      loadBins();
    }
  }, [status, session]);

  useEffect(() => {
    setPage(1);
  }, [
    selectedBin,
    startDate,
    endDate,
  ]);

  const {
    data,
    pagination,
    loading,
    error,
  } = useTelemetryHistory(
    selectedBin,
    10,
    page,
    startDate,
    endDate
  );

  async function handleExport() {
    if (
      !session?.user?.accessToken ||
      !selectedBin
    ) {
      return;
    }

    try {
      setExporting(true);

      const params =
        new URLSearchParams();

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

      const response =
        await fetch(
          `${API_URL}/api/export/telemetry?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          "Export failed"
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

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (error) {
      console.error(
        "Export CSV error:",
        error
      );

      alert(
        "ไม่สามารถ Export CSV ได้"
      );
    } finally {
      setExporting(false);
    }
  }

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
            Telemetry History
          </h1>

          <p className="mt-2 text-sm text-[#90AB8B]">
            ตรวจสอบข้อมูลย้อนหลังของ Smart Bin
          </p>
        </div>

        {/* Filter */}

        <section
          className="
            mt-6
            rounded-2xl
            border
            border-[#5A7863]/30
            bg-[#3B4953]
            p-5
            shadow-xl
            sm:p-6
          "
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">
              🔎
            </span>

            <h2 className="font-semibold text-[#EBF4DD]">
              Filter
            </h2>
          </div>

          <div
            className="
              mt-5
              grid
              gap-4
              sm:grid-cols-2
              lg:grid-cols-4
            "
          >
            {/* Bin */}

            <div>
              <label className="mb-2 block text-xs font-medium text-[#90AB8B]">
                Device
              </label>

              <select
                value={selectedBin}
                disabled={loadingBins}
                onChange={(event) =>
                  setSelectedBin(
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
                {bins.length === 0 ? (
                  <option value="">
                    No devices
                  </option>
                ) : (
                  bins.map((bin) => (
                    <option
                      key={bin.binId}
                      value={bin.binId}
                    >
                      {bin.name} (
                      {bin.binId})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Start */}

            <DateInput
              label="Start Date"
              value={startDate}
              onChange={(
                value
              ) =>
                setStartDate(value)
              }
            />

            {/* End */}

            <DateInput
              label="End Date"
              value={endDate}
              onChange={(
                value
              ) =>
                setEndDate(value)
              }
            />

            {/* Export */}

            <div className="flex items-end">
              <button
                onClick={
                  handleExport
                }
                disabled={
                  exporting ||
                  !selectedBin
                }
                className="
                  w-full
                  rounded-xl
                  bg-[#5A7863]
                  px-4
                  py-3
                  text-sm
                  font-semibold
                  text-[#EBF4DD]
                  transition
                  hover:bg-[#90AB8B]
                  hover:text-[#202A30]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {exporting
                  ? "Exporting..."
                  : "↓ Export CSV"}
              </button>
            </div>
          </div>

          {/* Reset */}

          {(startDate ||
            endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
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
              Reset date filter
            </button>
          )}
        </section>

        {/* Table */}

        <section
          className="
            mt-6
            overflow-hidden
            rounded-2xl
            border
            border-[#5A7863]/30
            bg-[#3B4953]
            shadow-xl
          "
        >
          {/* Table Header */}

          <div className="border-b border-[#5A7863]/30 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#90AB8B]">
                  Data Records
                </p>

                <h2 className="mt-1 text-xl font-bold text-[#EBF4DD]">
                  Telemetry
                </h2>
              </div>

              {pagination && (
                <span className="text-xs text-[#90AB8B]">
                  {pagination.total} records
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <HistoryLoading />
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-300">
              {error}
            </div>
          ) : data.length === 0 ? (
            <EmptyHistory />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-[#5A7863]/30 bg-[#202A30]/50">
                      <TableHead>
                        Time
                      </TableHead>

                      <TableHead>
                        Level
                      </TableHead>

                      <TableHead>
                        Capacitive
                      </TableHead>

                      <TableHead>
                        Inductive
                      </TableHead>

                      <TableHead>
                        Level Sensor
                      </TableHead>

                      <TableHead>
                        Voltage
                      </TableHead>

                      <TableHead>
                        Battery
                      </TableHead>
                    </tr>
                  </thead>

                  <tbody>
                    {data.map(
                      (item) => (
                        <tr
                          key={
                            item._id
                          }
                          className="
                            border-b
                            border-[#5A7863]/20
                            transition
                            hover:bg-[#5A7863]/10
                          "
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-sm text-[#EBF4DD]">
                            {formatDate(
                              item.timestamp
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <LevelCell
                              value={
                                item.level
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                item
                                  .sensorStatus
                                  .capacitive
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                item
                                  .sensorStatus
                                  .inductive
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                item
                                  .sensorStatus
                                  .level
                              }
                            />
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-[#EBF4DD]">
                            {item.voltage.toFixed(
                              1
                            )}
                            <span className="ml-1 text-[#90AB8B]">
                              V
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-[#EBF4DD]">
                            {item.batteryPct}
                            <span className="ml-1 text-[#90AB8B]">
                              %
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile hint */}

              <div className="border-t border-[#5A7863]/20 px-5 py-3 text-center text-xs text-[#90AB8B] sm:hidden">
                ← เลื่อนตารางซ้าย-ขวาเพื่อดูข้อมูล →
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
   Date Input
================================================== */

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-[#90AB8B]">
        {label}
      </label>

      <input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(
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
          [color-scheme:dark]
          focus:border-[#90AB8B]
          focus:ring-2
          focus:ring-[#90AB8B]/20
        "
      />
    </div>
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
   Level
================================================== */

function LevelCell({
  value,
}: {
  value: number;
}) {
  return (
    <div className="flex min-w-[110px] items-center gap-3">
      <span className="w-10 font-semibold text-[#EBF4DD]">
        {value}%
      </span>

      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#202A30]">
        <div
          className={
            value >= 90
              ? "h-full rounded-full bg-red-400"
              : value >= 75
                ? "h-full rounded-full bg-yellow-300"
                : "h-full rounded-full bg-[#90AB8B]"
          }
          style={{
            width: `${Math.min(
              Math.max(value, 0),
              100
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ==================================================
   Status
================================================== */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const ok = status === "ok";
  const warning =
    status === "warning";
  const offline =
    status === "offline";

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
          ok
            ? "bg-[#90AB8B]/10 text-[#90AB8B]"
            : warning
              ? "bg-yellow-300/10 text-yellow-300"
              : offline
                ? "bg-gray-300/10 text-gray-300"
                : "bg-red-400/10 text-red-300"
        }
      `}
    >
      <span
        className={`
          h-1.5
          w-1.5
          rounded-full
          ${
            ok
              ? "bg-[#90AB8B]"
              : warning
                ? "bg-yellow-300"
                : offline
                  ? "bg-gray-300"
                  : "bg-red-300"
          }
        `}
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
    <div className="flex items-center justify-between border-t border-[#5A7863]/20 p-4 sm:p-5">
      <button
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="
          rounded-xl
          border
          border-[#5A7863]/40
          bg-[#202A30]
          px-4
          py-2
          text-sm
          text-[#EBF4DD]
          transition
          hover:bg-[#5A7863]
          disabled:cursor-not-allowed
          disabled:opacity-30
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
          px-4
          py-2
          text-sm
          text-[#EBF4DD]
          transition
          hover:bg-[#5A7863]
          disabled:cursor-not-allowed
          disabled:opacity-30
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

function EmptyHistory() {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5A7863] text-2xl">
        📜
      </div>

      <h3 className="mt-5 font-semibold text-[#EBF4DD]">
        No telemetry data
      </h3>

      <p className="mt-2 text-sm text-[#90AB8B]">
        ยังไม่มีข้อมูล Telemetry สำหรับช่วงเวลาที่เลือก
      </p>
    </div>
  );
}

/* ==================================================
   Loading
================================================== */

function HistoryLoading() {
  return (
    <div className="space-y-3 p-5">
      {[1, 2, 3, 4, 5].map(
        (item) => (
          <div
            key={item}
            className="
              h-12
              animate-pulse
              rounded-lg
              bg-[#202A30]
            "
          />
        )
      )}
    </div>
  );
}

/* ==================================================
   Date Format
================================================== */

function formatDate(
  value: string
) {
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