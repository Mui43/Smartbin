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

  useEffect(() => {
    async function fetchHistory() {
      if (!session?.user?.accessToken || !binId) {
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
          `http://localhost:4000/api/bins/${binId}/telemetry?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
            },
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
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
        setLoading(false);
      }
    }

    fetchHistory();
  }, [
    binId,
    limit,
    page,
    startDate,
    endDate,
    session,
  ]);

  return {
    data,
    pagination,
    loading,
    error,
  };
}