"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export type StatsRange =
  | "day"
  | "week"
  | "month";

interface ChartData {
  label: string;
  level: number;
}

interface Summary {
  totalRecords: number;
  averageLevel: number;
  averageBattery: number;
  averageVoltage: number;
  maxLevel: number;
}

interface DashboardStats {
  range: StatsRange;
  startDate: string;
  endDate: string;
  summary: Summary;
  chart: ChartData[];
}

export function useDashboardStats(
  range: StatsRange
) {
  const { data: session } =
    useSession();

  const [data, setData] =
    useState<DashboardStats | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadStats() {
      if (
        !session?.user?.accessToken
      ) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `http://localhost:4000/api/dashboard/stats?range=${range}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${session.user.accessToken}`,
              },
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          setError(
            result?.error?.message ||
              "ไม่สามารถโหลดสถิติได้"
          );
          setData(null);
          return;
        }

        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error(
          "Dashboard stats error:",
          error
        );

        setError(
          "ไม่สามารถเชื่อมต่อ Backend ได้"
        );

        setData(null);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [range, session]);

  return {
    data,
    loading,
    error,
  };
}