"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

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

import {
  useDashboardStats,
  StatsRange,
} from "@/hooks/useDashboardStats";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

export default function WasteChart() {
  const [range, setRange] =
    useState<StatsRange>("day");

  const {
    data,
    loading,
    error,
  } = useDashboardStats(range);

  const chartRef = useRef<Chart<"line"> | null>(null);

  const chartData = {
    labels:
      data?.chart.map((item) => item.label) || [],

    datasets: [
      {
        label: "Waste Level (%)",

        data:
          data?.chart.map(
            (item) => item.level
          ) || [],

        borderColor: "#90AB8B",

        backgroundColor:
          "rgba(144, 171, 139, 0.12)",

        borderWidth: 2,

        pointRadius: 3,

        pointHoverRadius: 5,

        pointBackgroundColor: "#EBF4DD",

        pointBorderColor: "#5A7863",

        fill: true,

        tension: 0.35,
      },
    ],
  };

  const chartOptions = {
    responsive: true,

    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false,
      },

      tooltip: {
        backgroundColor: "#202A30",

        borderColor: "#5A7863",

        borderWidth: 1,

        titleColor: "#EBF4DD",

        bodyColor: "#90AB8B",

        padding: 12,

        displayColors: false,

        callbacks: {
          label: (context: any) =>
            `Waste Level: ${context.parsed.y}%`,
        },
      },
    },

    scales: {
      x: {
        grid: {
          color:
            "rgba(144, 171, 139, 0.08)",
        },

        ticks: {
          color: "#90AB8B",

          maxRotation: 0,

          autoSkip: true,

          maxTicksLimit: 8,
        },
      },

      y: {
        beginAtZero: true,

        max: 100,

        grid: {
          color:
            "rgba(144, 171, 139, 0.08)",
        },

        ticks: {
          color: "#90AB8B",

          callback: (value: any) =>
            `${value}%`,
        },
      },
    },
  };

  return (
    <section
      className="
        rounded-2xl
        border
        border-[#5A7863]/30
        bg-[#3B4953]
        p-5
        shadow-xl
        sm:p-6
      "
    >
      {/* Header */}

      <div
        className="
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div>
          <p
            className="
              text-xs
              font-medium
              uppercase
              tracking-wider
              text-[#90AB8B]
            "
          >
            Analytics
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#EBF4DD]">
            Waste Level
          </h2>

          <p className="mt-1 text-sm text-[#90AB8B]">
            Average waste level over time
          </p>
        </div>

        {/* Range */}

        <div
          className="
            flex
            w-full
            rounded-xl
            border
            border-[#5A7863]/40
            bg-[#202A30]
            p-1
            sm:w-auto
          "
        >
          {(
            [
              ["day", "Day"],
              ["week", "Week"],
              ["month", "Month"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() =>
                setRange(value)
              }
              className={`
                flex-1
                rounded-lg
                px-3
                py-2
                text-xs
                font-medium
                transition
                sm:flex-none
                sm:px-4
                ${
                  range === value
                    ? "bg-[#5A7863] text-[#EBF4DD] shadow"
                    : "text-[#90AB8B] hover:bg-[#3B4953] hover:text-[#EBF4DD]"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}

      {data && (
        <div
          className="
            mt-5
            grid
            grid-cols-2
            gap-3
            lg:grid-cols-4
          "
        >
          <StatCard
            label="Records"
            value={data.summary.totalRecords}
          />

          <StatCard
            label="Average Level"
            value={`${data.summary.averageLevel}%`}
          />

          <StatCard
            label="Average Battery"
            value={`${data.summary.averageBattery}%`}
          />

          <StatCard
            label="Max Level"
            value={`${data.summary.maxLevel}%`}
          />
        </div>
      )}

      {/* Chart */}

      <div className="mt-6">
        {loading ? (
          <div
            className="
              flex
              h-[300px]
              items-center
              justify-center
              rounded-xl
              bg-[#202A30]
              text-sm
              text-[#90AB8B]
            "
          >
            Loading chart...
          </div>
        ) : error ? (
          <div
            className="
              flex
              h-[300px]
              items-center
              justify-center
              rounded-xl
              bg-red-400/5
              text-sm
              text-red-300
            "
          >
            {error}
          </div>
        ) : !data?.chart.length ? (
          <div
            className="
              flex
              h-[300px]
              items-center
              justify-center
              rounded-xl
              bg-[#202A30]
              text-sm
              text-[#90AB8B]
            "
          >
            No telemetry data
          </div>
        ) : (
          <div className="h-[300px] w-full sm:h-[350px]">
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
    <div
      className="
        rounded-xl
        border
        border-[#5A7863]/25
        bg-[#202A30]
        p-3
        sm:p-4
      "
    >
      <p className="text-xs text-[#90AB8B]">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-[#EBF4DD] sm:text-xl">
        {value}
      </p>
    </div>
  );
}