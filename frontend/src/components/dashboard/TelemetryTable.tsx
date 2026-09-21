"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Telemetry {
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

interface Props {
  binId: string;
}

export default function TelemetryTable({
  binId,
}: Props) {
  const { data: session } = useSession();

  const [data, setData] =
    useState<Telemetry[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadTelemetry() {
      if (
        !session?.user?.accessToken ||
        !binId
      ) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `http://localhost:4000/api/bins/${binId}/telemetry?limit=10`,
          {
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
              "ไม่สามารถโหลด Telemetry ได้"
          );

          return;
        }

        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error(
          "Telemetry table error:",
          error
        );

        setError(
          "ไม่สามารถเชื่อมต่อ Backend ได้"
        );
      } finally {
        setLoading(false);
      }
    }

    loadTelemetry();
  }, [binId, session]);

  return (
    <section
      className="
        overflow-hidden
        rounded-2xl
        border
        border-[#5A7863]/30
        bg-[#3B4953]
        shadow-xl
      "
    >
      {/* Header */}

      <div
        className="
          flex
          flex-col
          gap-2
          border-b
          border-[#5A7863]/30
          p-5
          sm:flex-row
          sm:items-center
          sm:justify-between
          sm:p-6
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
            Realtime Data
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#EBF4DD]">
            Telemetry
          </h2>
        </div>

        <div
          className="
            w-fit
            rounded-lg
            bg-[#202A30]
            px-3
            py-2
            text-xs
            text-[#90AB8B]
          "
        >
          Bin: {binId}
        </div>
      </div>

      {/* Loading */}

      {loading && (
        <div className="p-8 text-center text-sm text-[#90AB8B]">
          Loading telemetry...
        </div>
      )}

      {/* Error */}

      {!loading && error && (
        <div className="p-8 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Empty */}

      {!loading &&
        !error &&
        data.length === 0 && (
          <div className="p-8 text-center text-sm text-[#90AB8B]">
            No telemetry data
          </div>
        )}

      {/* Table */}

      {!loading &&
        !error &&
        data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead>
                <tr className="border-b border-[#5A7863]/30 bg-[#202A30]/50">
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#90AB8B]">
                    Time
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#90AB8B]">
                    Level
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#90AB8B]">
                    Capacitive
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#90AB8B]">
                    Inductive
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#90AB8B]">
                    Level Sensor
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#90AB8B]">
                    Voltage
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#90AB8B]">
                    Battery
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.map((item) => (
                  <tr
                    key={item._id}
                    className="
                      border-b
                      border-[#5A7863]/20
                      transition
                      hover:bg-[#5A7863]/10
                    "
                  >
                    {/* Time */}

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-[#EBF4DD]">
                      {new Date(
                        item.timestamp
                      ).toLocaleString(
                        "th-TH",
                        {
                          dateStyle:
                            "short",
                          timeStyle:
                            "medium",
                        }
                      )}
                    </td>

                    {/* Level */}

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[#EBF4DD]">
                          {item.level}%
                        </span>

                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#202A30]">
                          <div
                            className="
                              h-full
                              rounded-full
                              bg-[#90AB8B]
                            "
                            style={{
                              width: `${Math.min(
                                Math.max(
                                  item.level,
                                  0
                                ),
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Capacitive */}

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={
                          item.sensorStatus
                            .capacitive
                        }
                      />
                    </td>

                    {/* Inductive */}

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={
                          item.sensorStatus
                            .inductive
                        }
                      />
                    </td>

                    {/* Level */}

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={
                          item.sensorStatus.level
                        }
                      />
                    </td>

                    {/* Voltage */}

                    <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-[#EBF4DD]">
                      {item.voltage.toFixed(
                        1
                      )}{" "}
                      <span className="text-[#90AB8B]">
                        V
                      </span>
                    </td>

                    {/* Battery */}

                    <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-[#EBF4DD]">
                      {item.batteryPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Mobile hint */}

      {!loading &&
        !error &&
        data.length > 0 && (
          <div className="border-t border-[#5A7863]/20 px-5 py-3 text-center text-xs text-[#90AB8B] sm:hidden">
            ← เลื่อนตารางไปด้านข้างเพื่อดูข้อมูลเพิ่มเติม →
          </div>
        )}
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const isOk = status === "ok";
  const isWarning = status === "warning";
  const isOffline = status === "offline";

  const color = isOk
    ? "text-[#90AB8B]"
    : isWarning
      ? "text-yellow-300"
      : isOffline
        ? "text-gray-300"
        : "text-red-300";

  const background = isOk
    ? "bg-[#90AB8B]/10"
    : isWarning
      ? "bg-yellow-300/10"
      : isOffline
        ? "bg-gray-300/10"
        : "bg-red-300/10";

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        px-2.5
        py-1
        text-xs
        font-medium
        ${color}
        ${background}
      `}
    >
      <span
        className={`
          h-1.5
          w-1.5
          rounded-full
          ${
            isOk
              ? "bg-[#90AB8B]"
              : isWarning
                ? "bg-yellow-300"
                : isOffline
                  ? "bg-gray-300"
                  : "bg-red-300"
          }
        `}
      />

      {status}
    </span>
  );
}