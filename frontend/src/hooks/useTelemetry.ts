"use client";

import { useEffect, useState } from "react";

export interface TelemetryData {
  binId: string;
  level: number;
  sensorStatus: {
    capacitive: "ok" | "warning" | "error" | "offline";
    inductive: "ok" | "warning" | "error" | "offline";
    level: "ok" | "warning" | "error" | "offline";
  };
  voltage: number;
  batteryPct: number;
  timestamp: string;
}

export function useTelemetry() {
  const [telemetryByBin, setTelemetryByBin] =
    useState<Record<string, TelemetryData>>({});

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    const eventSource = new EventSource(
      `${apiUrl}/api/realtime`
    );

    eventSource.addEventListener("connected", () => {
      setConnected(true);
    });

    eventSource.addEventListener("telemetry", (event) => {
      try {
        const data = JSON.parse(event.data);

        if (typeof data.binId !== "string") return;
        setTelemetryByBin((current) => ({
          ...current,
          [data.binId]: data,
        }));
        setConnected(true);
      } catch (error) {
        console.error(
          "SSE data parse error:",
          error
        );
      }
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return {
    telemetryByBin,
    connected,
  };
}
