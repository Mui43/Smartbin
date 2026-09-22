"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Database, RefreshCw, AlertCircle } from "lucide-react";

export interface TelemetryHistoryItem {
  _id?: string;
  binId: string;
  level: number;
  voltage: number;
  batteryPct: number;
  sensorStatus?: {
    capacitive?: string;
    inductive?: string;
    level?: string;
  };
  timestamp: string;
}

interface TelemetryTableProps {
  binId?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function TelemetryTable({ binId }: TelemetryTableProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<TelemetryHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(
    async (isSilent = false) => {
      if (!binId) {
        setLoading(false);
        return;
      }

      if (isSilent || data.length > 0) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const token = session?.user?.accessToken;
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const res = await fetch(
          `${API_URL}/api/bins/${binId}/telemetry?limit=10`,
          { headers },
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch history (${res.status})`);
        }

        const result = await res.json();
        const historyList = Array.isArray(result) ? result : result.data || [];

        setData(historyList);
      } catch (err: any) {
        console.error("TelemetryTable fetch error:", err);
        setError(err.message || "Failed to load telemetry history");
        if (!isSilent && data.length === 0) {
          setData([]);
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [binId, session?.user?.accessToken, data.length],
  );

  useEffect(() => {
    fetchHistory();
  }, [binId, session?.user?.accessToken]);

  return (
    <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
      {/* Header Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14] text-emerald-400">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Telemetry Logs
            </h2>
            <p className="text-xs font-mono text-slate-400">
              {binId ? `Bin ID: ${binId}` : "No Bin Selected"}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchHistory(true)}
          disabled={loading || isRefreshing || !binId}
          className="flex items-center gap-2 rounded-xl border border-[#212b3d] bg-[#0a0d14] px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-[#212b3d] hover:text-white active:scale-95 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={
              loading || isRefreshing ? "animate-spin text-emerald-400" : ""
            }
          />
          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Table Section */}
      <div className="relative overflow-x-auto rounded-xl border border-[#212b3d] bg-[#0a0d14]">
        {/* Subtle Refreshing Overlay */}
        {isRefreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0d14]/30 backdrop-blur-[1px] transition-all">
            <div className="flex items-center gap-2 rounded-lg border border-[#212b3d] bg-[#131822] px-3 py-1.5 text-xs font-medium text-emerald-400 shadow-lg">
              <RefreshCw size={14} className="animate-spin" />
              <span>Updating logs...</span>
            </div>
          </div>
        )}

        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-[#212b3d] bg-[#131822] text-xs font-semibold uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3.5">Timestamp</th>
              <th className="px-4 py-3.5">Waste Level</th>
              <th className="px-4 py-3.5">Voltage</th>
              <th className="px-4 py-3.5">Battery</th>
              <th className="px-4 py-3.5 text-right">Status</th>
            </tr>
          </thead>

          <tbody
            className={`divide-y divide-[#212b3d]/60 transition-opacity duration-200 ${
              isRefreshing ? "opacity-40" : "opacity-100"
            }`}
          >
            {loading ? (
              // Initial Skeleton Rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-4">
                    <div className="h-3.5 w-32 rounded bg-[#212b3d]" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-3.5 w-12 rounded bg-[#212b3d]" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-3.5 w-16 rounded bg-[#212b3d]" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-3.5 w-14 rounded bg-[#212b3d]" />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="ml-auto h-5 w-20 rounded-full bg-[#212b3d]" />
                  </td>
                </tr>
              ))
            ) : error && data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-rose-400">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  No telemetry history recorded for this bin.
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const dateStr = item.timestamp
                  ? new Date(item.timestamp).toLocaleString("th-TH")
                  : "N/A";

                return (
                  <tr
                    key={item._id || index}
                    className="transition hover:bg-[#212b3d]/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-400">
                      {dateStr}
                    </td>

                    <td className="px-4 py-3.5 font-semibold">
                      <span
                        className={
                          item.level >= 80
                            ? "text-rose-400"
                            : item.level >= 60
                              ? "text-amber-400"
                              : "text-emerald-400"
                        }
                      >
                        {item.level}%
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      {item.voltage != null
                        ? `${item.voltage.toFixed(1)} V`
                        : "-"}
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      {item.batteryPct != null ? `${item.batteryPct}%` : "-"}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                        Received
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
