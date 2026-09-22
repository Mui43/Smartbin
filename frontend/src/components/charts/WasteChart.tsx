"use client";

import { useEffect, useRef, useState } from "react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useDashboardStats, StatsRange } from "@/hooks/useDashboardStats";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

export default function WasteChart() {
  const [range, setRange] = useState<StatsRange>("day");

  const { data, loading, error } = useDashboardStats(range);

  const chartRef = useRef<Chart<"line"> | null>(null);

  const chartData = {
    labels: data?.chart.map((item) => item.label) || [],
    datasets: [
      {
        label: "Waste Level (%)",
        data: data?.chart.map((item) => item.level) || [],
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#0a0d14",
        pointBorderWidth: 2,
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#131822",
        borderColor: "#212b3d",
        borderWidth: 1,
        titleColor: "#ffffff",
        bodyColor: "#10b981",
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => `Waste Level: ${context.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(33, 43, 61, 0.5)",
        },
        ticks: {
          color: "#94a3b8",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: "rgba(33, 43, 61, 0.5)",
        },
        ticks: {
          color: "#94a3b8",
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  return (
    <section className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
            Analytics
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
            Waste Level
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Average waste level over time
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex w-full rounded-xl border border-[#212b3d] bg-[#0a0d14] p-1 sm:w-auto">
          {(
            [
              ["day", "Day"],
              ["week", "Week"],
              ["month", "Month"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              disabled={loading}
              onClick={() => setRange(value)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 sm:flex-none sm:px-4 ${
                range === value
                  ? "bg-[#212b3d] text-emerald-400 shadow-sm"
                  : "text-slate-400 hover:text-white"
              } ${loading ? "cursor-not-allowed opacity-70" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div
        className={`mt-5 grid grid-cols-2 gap-3 transition-opacity duration-200 lg:grid-cols-4 ${
          loading && data ? "opacity-50" : "opacity-100"
        }`}
      >
        <StatCard
          label="Records"
          value={data ? data.summary.totalRecords : "-"}
        />
        <StatCard
          label="Average Level"
          value={data ? `${data.summary.averageLevel}%` : "-"}
        />
        <StatCard
          label="Average Battery"
          value={data ? `${data.summary.averageBattery}%` : "-"}
        />
        <StatCard
          label="Max Level"
          value={data ? `${data.summary.maxLevel}%` : "-"}
        />
      </div>

      {/* Chart Section */}
      <div className="relative mt-6 h-[300px] w-full sm:h-[350px]">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#131822]/40 backdrop-blur-[1px] transition-all">
            <span className="rounded-lg border border-[#212b3d] bg-[#0a0d14]/90 px-3 py-1.5 text-xs font-medium text-emerald-400 shadow-md">
              Loading...
            </span>
          </div>
        )}

        {/* Content State */}
        {error ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs font-medium text-rose-400">
            {error}
          </div>
        ) : !data?.chart.length && !loading ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14] text-xs font-medium text-slate-400">
            No telemetry data recorded
          </div>
        ) : (
          <div
            className={`h-full w-full transition-opacity duration-200 ${
              loading ? "opacity-30" : "opacity-100"
            }`}
          >
            <Line ref={chartRef} data={chartData} options={chartOptions} />
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#212b3d] bg-[#0a0d14] p-3.5 sm:p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight text-white sm:text-xl">
        {value}
      </p>
    </div>
  );
}
