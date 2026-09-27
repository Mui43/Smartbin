"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export interface TelemetryHistory {
  _id: string;
  binId: string;
  level: number;
  sensorStatus: {
    capacitive: string;
    inductive: string;
    level: string;
  };
  voltage: number;
  batteryPct: number;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function useTelemetryHistory(
  binId: string,
  limit = 10,
  page = 1,
  startDate = "",
  endDate = ""
) {
  const { data: session } = useSession();

  const [data, setData] = useState<TelemetryHistory[]>([]);
  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const accessToken = session?.user?.accessToken;

  useEffect(() => {
    const controller = new AbortController();
    async function fetchHistory() {
      setData([]);
      setPagination(null);
      setError("");
      if (!accessToken || !binId) {
        setLoading(false);
        return;
      }
      if (startDate && endDate && startDate > endDate) {
        setError("วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("limit", String(limit));

        if (startDate) {
          params.set("startDate", startDate);
        }

        if (endDate) {
          params.set("endDate", endDate);
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/bins/${encodeURIComponent(binId)}/telemetry?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();
        if (controller.signal.aborted) return;

        if (!response.ok || !result.success) {
          setError(
            result?.error?.message ||
              "ไม่สามารถโหลดข้อมูล Telemetry ได้"
          );

          setData([]);
          setPagination(null);
          return;
        }

        if (result.success) {
          setData(result.data);
          setPagination(result.pagination);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(
          "Telemetry history error:",
          error
        );

        setError(
          "ไม่สามารถเชื่อมต่อ Backend ได้"
        );

        setData([]);
        setPagination(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchHistory();
    return () => controller.abort();
  }, [
    binId,
    limit,
    page,
    startDate,
    endDate,
    accessToken,
    revision,
  ]);

  return {
    data,
    pagination,
    loading,
    error,
    reload: () => setRevision((current) => current + 1),
  };
}
