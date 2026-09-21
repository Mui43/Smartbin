"use client";

import { useTelemetry } from "@/hooks/useTelemetry";
import { useAlerts } from "@/hooks/useAlerts";

import BinOverview from "@/components/dashboard/BinOverview";
import SolarBattery from "@/components/dashboard/SolarBattery";
import LockControl from "@/components/dashboard/LockControl";
import WasteChart from "@/components/charts/WasteChart";
import TelemetryTable from "@/components/dashboard/TelemetryTable";

import AlertBanner from "@/components/ui/AlertBanner";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function Home() {
  const {
    telemetry,
    connected,
  } = useTelemetry();

  const {
    alerts,
  } = useAlerts();

  return (
    <main className="min-h-screen bg-[h] text-[#EBF4DD]">
      {/* Sidebar */}

      <Sidebar />

      {/* Main Content */}

      <div
        className="
          min-h-screen
          p-4
          sm:p-6
          lg:ml-64
          lg:p-8
        "
      >
        <Header />

        {/* =========================
            Connection Status
        ========================= */}

        <div
          className="
            mb-5
            flex
            items-center
            justify-between
            rounded-xl
            border
            border-[#5A7863]/40
            bg-[#3B4953]
            px-4
            py-3
          "
        >
          <div className="flex items-center gap-3">
            <span
              className={`
                h-2.5
                w-2.5
                rounded-full
                ${connected
                  ? "bg-[#90AB8B] shadow-[0_0_10px_#90AB8B]"
                  : "bg-red-400"
                }
              `}
            />

            <span className="text-sm text-[#90AB8B]">
              {connected
                ? "Realtime Connected"
                : "Disconnected"}
            </span>
          </div>

          <span className="hidden text-xs text-[#90AB8B]/60 sm:block">
            MQTT / SSE
          </span>
        </div>

        {/* =========================
            Alert
        ========================= */}

        <div className="mb-6">
          <AlertBanner alerts={alerts} />
        </div>

        {/* =========================
            Waiting
        ========================= */}

        {!telemetry ? (
          <div
            className="
              flex
              min-h-[300px]
              items-center
              justify-center
              rounded-2xl
              border
              border-[#5A7863]/40
              bg-[#3B4953]
              p-6
              shadow-xl
            "
          >
            <div className="text-center">
              <div className="mb-4 text-4xl">
                🗑️
              </div>

              <p className="font-medium text-[#EBF4DD]">
                Waiting for telemetry...
              </p>

              <p className="mt-2 text-sm text-[#90AB8B]">
                Waiting for data from Smart Bin
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* =========================
                Overview
            ========================= */}

            <section>
              <BinOverview telemetry={telemetry} />
            </section>

            {/* =========================
                Chart
            ========================= */}

            <section className="mt-6">
              <WasteChart />
            </section>

            {/* =========================
                Solar + Lock
            ========================= */}

            <section
              className="
                mt-6
                grid
                gap-6
                lg:grid-cols-2
              "
            >
              <SolarBattery telemetry={telemetry} />

              <LockControl
                binId={telemetry.binId}
              />
            </section>

            {/* =========================
                Sensors
            ========================= */}

            <section
              className="
                mt-6
                rounded-2xl
                border
                border-[#5A7863]/40
                bg-[#3B4953]
                p-5
                shadow-xl
                sm:p-6
              "
            >
              <div className="mb-5">
                <p className="text-xs font-medium uppercase tracking-wider text-[#90AB8B]">
                  Monitoring
                </p>

                <h2 className="mt-1 text-xl font-bold text-[#EBF4DD]">
                  Sensor Status
                </h2>
              </div>

              <div
                className="
                  grid
                  gap-4
                  sm:grid-cols-2
                  lg:grid-cols-3
                "
              >
                <Sensor
                  name="Capacitive"
                  status={
                    telemetry.sensorStatus.capacitive
                  }
                />

                <Sensor
                  name="Inductive"
                  status={
                    telemetry.sensorStatus.inductive
                  }
                />

                <Sensor
                  name="Level"
                  status={
                    telemetry.sensorStatus.level
                  }
                />
              </div>
            </section>

            {/* =========================
                Telemetry Table
            ========================= */}

            <section className="mt-6">
              <TelemetryTable
                binId={telemetry.binId}
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}

/* =========================
   Sensor Component
========================= */

function Sensor({
  name,
  status,
}: {
  name: string;
  status: string;
}) {
  const isOk = status === "ok";
  const isWarning = status === "warning";
  const isOffline = status === "offline";

  const statusColor = isOk
    ? "text-[#90AB8B]"
    : isWarning
      ? "text-yellow-300"
      : isOffline
        ? "text-gray-400"
        : "text-red-400";

  const statusBackground = isOk
    ? "bg-[#5A7863]/40"
    : isWarning
      ? "bg-yellow-400/10"
      : isOffline
        ? "bg-gray-400/10"
        : "bg-red-400/10";

  return (
    <div
      className="
        rounded-xl
        border
        border-[#5A7863]/40
        bg-[#3B4953]
        p-4
        transition
        duration-200
        hover:border-[#90AB8B]/40
        hover:bg-[#5A7863]/30
      "
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#90AB8B]">
          {name}
        </p>

        <span
          className={`
            rounded-full
            px-2
            py-1
            text-[10px]
            font-semibold
            uppercase
            ${statusBackground}
            ${statusColor}
          `}
        >
          {status}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span
          className={`
            h-3
            w-3
            rounded-full
            ${isOk ? "bg-[#90AB8B]" : ""}
            ${isWarning
              ? "bg-yellow-300"
              : ""
            }
            ${isOffline
              ? "bg-gray-400"
              : ""
            }
            ${!isOk &&
              !isWarning &&
              !isOffline
              ? "bg-red-400"
              : ""
            }
          `}
        />

        <p
          className={`font-semibold ${statusColor}`}
        >
          {status === "ok"
            ? "Operational"
            : status === "warning"
              ? "Warning"
              : status === "offline"
                ? "Offline"
                : "Error"}
        </p>
      </div>
    </div>
  );
}