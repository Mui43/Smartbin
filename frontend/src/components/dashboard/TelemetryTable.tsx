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

export default function TelemetryTable({ binId }: TelemetryTableProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<TelemetryHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!binId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = session?.user?.accessToken;
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const res = await fetch(
        `http://localhost:4000/api/bins/${binId}/telemetry?limit=10`,
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
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [binId, session?.user?.accessToken]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="rounded-2xl border border-[#5A7863]/40 bg-[#3B4953] p-5 shadow-xl sm:p-6">
      {/* Header Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#202A30] text-[#90AB8B] shadow-inner">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#EBF4DD]">Telemetry Logs</h2>
            <p className="text-xs text-[#90AB8B]">
              {binId ? `Bin ID: ${binId}` : "No Bin Selected"}
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading || !binId}
          className="flex items-center gap-2 rounded-xl border border-[#5A7863]/40 bg-[#202A30] px-3.5 py-2 text-xs font-semibold text-[#EBF4DD] transition hover:bg-[#5A7863]/30 hover:text-white disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto rounded-xl border border-[#5A7863]/30 bg-[#202A30]/60">
        <table className="w-full text-left text-sm text-[#EBF4DD]">
          <thead className="border-b border-[#5A7863]/30 bg-[#202A30] text-xs font-semibold uppercase text-[#90AB8B]">
            <tr>
              <th className="px-4 py-3.5">Timestamp</th>
              <th className="px-4 py-3.5">Waste Level</th>
              <th className="px-4 py-3.5">Voltage</th>
              <th className="px-4 py-3.5">Battery</th>
              <th className="px-4 py-3.5 text-right">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#5A7863]/20">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#90AB8B]">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw
                      size={18}
                      className="animate-spin text-[#90AB8B]"
                    />
                    <span>Loading telemetry data from server...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-red-400">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#90AB8B]">
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
                    className="transition hover:bg-[#5A7863]/20"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-[#90AB8B]">
                      {dateStr}
                    </td>

                    <td className="px-4 py-3.5 font-semibold">
                      <span
                        className={
                          item.level >= 80
                            ? "text-red-400"
                            : item.level >= 60
                              ? "text-yellow-300"
                              : "text-emerald-400"
                        }
                      >
                        {item.level}%
                      </span>
                    </td>

                    <td className="px-4 py-3.5">{item.voltage ?? "-"} V</td>

                    <td className="px-4 py-3.5">{item.batteryPct ?? "-"}%</td>

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
