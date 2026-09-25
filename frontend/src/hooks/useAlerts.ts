"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export interface AlertData {
  _id?: string;

  binId: string;
  binName?: string;
  location?: string;

  type:
  | "FULL"
  | "NEAR_FULL"
  | "SENSOR_ERROR"
  | "LOW_BATTERY"
  | "OFFLINE";

  level: "warning" | "critical";

  message: string;

  active?: boolean;

  sentToLine?: boolean;

  createdAt?: string;

  resolvedAt?: string;
}

export function useAlerts() {
  const { data: session } = useSession();

  const [alerts, setAlerts] =
    useState<AlertData[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadAlerts() {
    if (!session?.user?.accessToken) {
      setLoading(false);
      return;
    }

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:4000";

      const response = await fetch(
        `${API_URL}/api/alerts`,
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
          "ไม่สามารถโหลด Alerts ได้"
        );

        setAlerts([]);
        return;
      }

      if (result.success) {
        setAlerts(result.data);
        setError("");
      }
    } catch (error) {
      console.error(
        "Alert error:",
        error
      );

      setError(
        "ไม่สามารถเชื่อมต่อ Backend ได้"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user?.accessToken) {
      loadAlerts();

      const interval =
        setInterval(
          loadAlerts,
          10000
        );

      return () =>
        clearInterval(interval);
    }
  }, [session]);

  return {
    alerts,
    loading,
    error,
    reload: loadAlerts,
  };
}