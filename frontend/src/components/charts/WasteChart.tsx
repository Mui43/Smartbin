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

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

type WasteRange = "day" | "week" | "month";

interface WasteChartItem {
  label: string;
  count: number;
}

interface WasteStats {
  range: WasteRange;
  total: number;
  chart: WasteChartItem[];
}

export default function WasteChart({ binId }: { binId: string }) {
  const [range, setRange] = useState<WasteRange>("day");

  const [month, setMonth] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}`;
  });

  const [data, setData] = useState<WasteStats | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const chartRef = useRef<Chart<"line"> | null>(null);

  useEffect(() => {
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000";
    let requestController: AbortController | null = null;

    async function loadWasteStats() {
      requestController?.abort();
      const controller = new AbortController();
      requestController = controller;

      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();

        params.set("range", range);
        params.set("binId", binId);

        if (range === "month") {
          params.set("month", month);
        }

        const response = await fetch(
          `${API_URL}/api/waste-stats?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            "ไม่สามารถโหลดข้อมูลจำนวนขยะได้",
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(
            result.message ||
              "ไม่สามารถโหลดข้อมูลได้",
          );
        }

        if (!controller.signal.aborted) {
          setData(result.data);
        }
      } catch (err: any) {
        if (!controller.signal.aborted && err.name !== "AbortError") {
          console.error(
            "Waste stats error:",
            err,
          );

          setError(
            err.message ||
              "เกิดข้อผิดพลาดในการโหลดข้อมูล",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadWasteStats();

    const eventSource = new EventSource(
      `${API_URL}/api/realtime`,
    );

    eventSource.addEventListener("waste", (event) => {
      try {
        if (JSON.parse(event.data).binId === binId) {
          loadWasteStats();
        }
      } catch (error) {
        console.error("Waste event parse error:", error);
      }
    });
    eventSource.addEventListener("connected", () => {
      loadWasteStats();
    });

    return () => {
      requestController?.abort();
      eventSource.close();
    };
  }, [range, month, binId]);

  const chartData = {
    labels:
      data?.chart.map(
        (item) => item.label,
      ) || [],

    datasets: [
      {
        label: "จำนวนขยะ",

        data:
          data?.chart.map(
            (item) => item.count,
          ) || [],

        // CSS/รูปแบบเดิม
        borderColor: "#10b981",

        backgroundColor:
          "rgba(16, 185, 129, 0.12)",

        borderWidth: 2,

        pointRadius: 3,

        pointHoverRadius: 6,

        pointBackgroundColor:
          "#10b981",

        pointBorderColor:
          "#0a0d14",

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
          label: (context: any) =>
            `จำนวนขยะ: ${context.parsed.y} ชิ้น`,
        },
      },
    },

    scales: {
      x: {
        grid: {
          color:
            "rgba(33, 43, 61, 0.5)",
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

        // เปลี่ยนจาก 100% เป็นจำนวนชิ้น
        suggestedMax: 10,

        grid: {
          color:
            "rgba(33, 43, 61, 0.5)",
        },

        ticks: {
          color: "#94a3b8",

          precision: 0,

          callback: (value: any) =>
            `${value} ชิ้น`,
        },
      },
    },
  };

  function formatMonth(value: string) {
    const [year, month] =
      value.split("-").map(Number);

    const date = new Date(
      year,
      month - 1,
      1,
    );

    return date.toLocaleDateString(
      "th-TH",
      {
        month: "long",
        year: "numeric",
      },
    );
  }

  return (
    <section className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
            Analytics
          </p>

          <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
            จำนวนขยะ
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            จำนวนขยะที่ตรวจพบจาก IR Sensor
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
              } ${
                loading
                  ? "cursor-not-allowed opacity-70"
                  : ""
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Month Selector */}
      {range === "month" && (
        <div className="mt-4 flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) =>
              setMonth(e.target.value)
            }
            className="rounded-lg border border-[#212b3d] bg-[#0a0d14] px-3 py-2 text-xs text-white outline-none"
          />

          <span className="text-xs text-slate-400">
            {formatMonth(month)}
          </span>
        </div>
      )}

      {/* Summary Cards */}
      <div
        className={`mt-5 grid grid-cols-2 gap-3 transition-opacity duration-200 lg:grid-cols-4 ${
          loading && data
            ? "opacity-50"
            : "opacity-100"
        }`}
      >
        <StatCard
          label="จำนวนขยะทั้งหมด"
          value={
            data
              ? `${data.total} ชิ้น`
              : "-"
          }
        />

        <StatCard
          label="ช่วงเวลา"
          value={
            range === "day"
              ? "วันนี้"
              : range === "week"
                ? "สัปดาห์นี้"
                : formatMonth(month)
          }
        />

        <StatCard
          label="Sensor"
          value="IR Sensor"
        />

        <StatCard
          label="สถานะ"
          value={
            loading
              ? "Loading..."
              : "Connected"
          }
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
        ) : !data?.chart.length &&
          !loading ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14] text-xs font-medium text-slate-400">
            No waste detection data recorded
          </div>
        ) : (
          <div
            className={`h-full w-full transition-opacity duration-200 ${
              loading
                ? "opacity-30"
                : "opacity-100"
            }`}
          >
            <Line
              ref={chartRef}
              data={chartData}
              options={chartOptions}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-[#212b3d] bg-[#0a0d14] p-3.5 sm:p-4">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold tracking-tight text-white sm:text-xl">
        {value}
      </p>
    </div>
  );
}
