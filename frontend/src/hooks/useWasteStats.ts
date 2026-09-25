"use client";

import { useEffect, useState } from "react";

export type WasteRange =
  | "day"
  | "week"
  | "month";

export interface WasteChartItem {
  label: string;
  count: number;
}

export interface WasteStats {
  range: WasteRange;
  total: number;
  chart: WasteChartItem[];
}

export function useWasteStats(
  range: WasteRange,
  month?: string
) {
  const [data, setData] =
    useState<WasteStats | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError("");

        const API_URL =
          process.env.NEXT_PUBLIC_API_URL ||
          "http://localhost:4000";

        const params = new URLSearchParams();

        params.set("range", range);

        if (range === "month" && month) {
          params.set("month", month);
        }

        const response = await fetch(
          `${API_URL}/api/waste-stats?${params}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load waste statistics"
          );
        }

        const result = await response.json();

        setData(result.data);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(
            err.message ||
              "Failed to load waste statistics"
          );
        }
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, [range, month]);

  return {
    data,
    loading,
    error,
  };
}
