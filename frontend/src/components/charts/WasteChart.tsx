"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Line } from "react-chartjs-2";

import { useDashboardStats, StatsRange } from "@/hooks/useDashboardStats";

import { useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

export default function WasteChart() {
  const [range, setRange] = useState<StatsRange>("day");

  const { data, loading, error } = useDashboardStats(range);

  // เช็กว่าเป็น "การโหลดครั้งแรกสุด" หรือไม่
  const isInitialLoading = loading && !data;

  const labels = data?.chart.map((item) => item.label) || [];
  const values = data?.chart.map((item) => item.level) || [];

  const chartData = {
    labels,
    datasets: [
      {
        label: "Waste Level (%)",
        data: values,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        pointRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (value: string | number) => `${value}%`,
        },
      },
    },
    plugins: {
      legend: {
        display: true,
      },
    },
  };

  return (
    <div className="rounded-xl bg-[#2C2E3A] p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Waste Level Statistics</h2>
            {/* แสดงไฟสถานะ Updating... แบบสมูท */}
            {loading && !isInitialLoading && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Updating...
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-400">
            ข้อมูลระดับขยะจาก MongoDB
          </p>
        </div>

        <div className="flex gap-2">
          <RangeButton
            active={range === "day"}
            onClick={() => setRange("day")}
            disabled={loading}
          >
            Day
          </RangeButton>

          <RangeButton
            active={range === "week"}
            onClick={() => setRange("week")}
            disabled={loading}
          >
            Week
          </RangeButton>

          <RangeButton
            active={range === "month"}
            onClick={() => setRange("month")}
            disabled={loading}
          >
            Month
          </RangeButton>
        </div>
      </div>

      {isInitialLoading ? (
        <div className="flex h-80 items-center justify-center text-gray-400">
          กำลังโหลดข้อมูล...
        </div>
      ) : error ? (
        <div className="flex h-80 items-center justify-center text-red-400">
          {error}
        </div>
      ) : !data ? (
        <div className="flex h-80 items-center justify-center text-gray-400">
          ไม่มีข้อมูล
        </div>
      ) : (
        /* เมื่อกด Filter ให้ข้อมูลชุดเดิมจางลง + กะพริบ (pulse) นุ่มนวล ไม่ถอดกราฟออก */
        <div
          className={`transition-all duration-300 ${
            loading
              ? "opacity-40 animate-pulse pointer-events-none filter blur-[0.5px]"
              : "opacity-100"
          }`}
        >
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Average Level"
              value={`${data.summary.averageLevel}%`}
            />

            <StatCard label="Max Level" value={`${data.summary.maxLevel}%`} />

            <StatCard
              label="Battery"
              value={`${data.summary.averageBattery}%`}
            />

            <StatCard
              label="Voltage"
              value={`${data.summary.averageVoltage} V`}
            />
          </div>

          <div className="h-80">
            {data.chart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-400">
                ยังไม่มีข้อมูล Telemetry
              </div>
            ) : (
              <Line data={chartData} options={options} />
            )}
          </div>

          <div className="mt-4 text-sm text-gray-400">
            Telemetry Records:{" "}
            <span className="font-semibold text-white">
              {data.summary.totalRecords}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function RangeButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm transition disabled:cursor-not-allowed ${
        active
          ? "bg-[#0A21C0] text-white"
          : "bg-[#141619] text-gray-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#141619] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}
