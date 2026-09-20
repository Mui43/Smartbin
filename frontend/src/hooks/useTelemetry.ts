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
  const [telemetry, setTelemetry] =
    useState<TelemetryData | null>(null);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const apiUrl = "http://localhost:4000";

    const eventSource = new EventSource(
      `${apiUrl}/api/realtime`
    );

    eventSource.addEventListener("connected", () => {
      setConnected(true);
    });

    eventSource.addEventListener("telemetry", (event) => {
      try {
        const data = JSON.parse(event.data);

        setTelemetry(data);
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
    telemetry,
    connected,
  };
}