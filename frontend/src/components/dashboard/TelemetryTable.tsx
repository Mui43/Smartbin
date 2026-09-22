"use client";

import { useState } from "react";
import { useTelemetryHistory } from "@/hooks/useTelemetryHistory";

export default function TelemetryTable({ binId }: { binId: string }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const {
    data = [],
    pagination,
    loading,
  } = useTelemetryHistory(binId, limit, page);

  // เช็กว่าเป็น "การโหลดครั้งแรกสุด" หรือไม่ (ยังไม่มีข้อมูลอะไรเลย)
  const isInitialLoading = loading && data.length === 0;

  return (
    <div className="mt-6 rounded-xl bg-[#2C2E3A] p-6">
      {/* Header & Filter */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold">Telemetry History</h2>
            <p className="text-sm text-gray-400">Bin: {binId}</p>
          </div>
          {/* แสดง Spinner เล็กๆ สวยๆ ตอนกำลังโหลดข้อมูลใหม่ โดยไม่บังตาราง */}
          {loading && !isInitialLoading && (
            <span className="text-xs text-emerald-400 animate-pulse">
              Updating...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Show</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg bg-[#141619] px-3 py-2 text-white border border-white/5 focus:outline-none"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Body Content */}
      {isInitialLoading ? (
        // ขึ้นข้อความโหลดเฉพาะตอนเปิดหน้าครั้งแรกสุดที่ยังไม่มีข้อมูลเท่านั้น
        <p className="py-12 text-center text-gray-400">Loading telemetry...</p>
      ) : data.length === 0 ? (
        <p className="py-12 text-center text-gray-400">No telemetry data</p>
      ) : (
        <>
          {/* ปรับ Opacity ของตารางเบาๆ ตอนกำลังโหลดหน้าใหม่ ทำให้เปลี่ยนเนียนแบบ Smooth */}
          <div
            className={`overflow-x-auto transition-opacity duration-200 ${
              loading ? "opacity-40 pointer-events-none" : "opacity-100"
            }`}
          >
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-600 text-gray-400">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Battery</th>
                  <th className="px-4 py-3">Voltage</th>
                  <th className="px-4 py-3">Sensors</th>
                </tr>
              </thead>

              <tbody>
                {data.map((item) => (
                  <tr
                    key={item._id || item.timestamp}
                    className="border-b border-gray-700/60 even:bg-white/[0.02] hover:bg-white/10 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString("th-TH")}
                    </td>
                    <td className="px-4 py-3 font-semibold">{item.level}%</td>
                    <td className="px-4 py-3">{item.batteryPct}%</td>
                    <td className="px-4 py-3">{item.voltage} V</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-xs">
                        <div>C: {item.sensorStatus?.capacitive}</div>
                        <div>I: {item.sensorStatus?.inductive}</div>
                        <div>L: {item.sensorStatus?.level}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination?.hasPreviousPage || loading}
              className="rounded-lg bg-[#141619] px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/5"
            >
              ← Previous
            </button>

            <span className="text-sm text-gray-400">
              Page {pagination?.page ?? page} / {pagination?.totalPages ?? 1}
              {" • "}
              {pagination?.total ?? 0} records
            </span>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination?.hasNextPage || loading}
              className="rounded-lg bg-[#141619] px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/5"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
