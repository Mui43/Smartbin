"use client";

interface TelemetryData {
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

export default function BinOverview({
  telemetry,
}: {
  telemetry: TelemetryData;
}) {
  const level = Math.min(
    Math.max(telemetry.level, 0),
    100
  );

  const levelStatus =
    level >= 90
      ? "Full"
      : level >= 75
        ? "Nearly Full"
        : "Normal";

  const levelColor =
    level >= 90
      ? "text-red-400"
      : level >= 75
        ? "text-yellow-300"
        : "text-[#8EB69B]";

  const progressColor =
    level >= 90
      ? "bg-red-400"
      : level >= 75
        ? "bg-yellow-300"
        : "bg-[#8EB69B]";

  return (
    <section>
      {/* Header */}

      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-[#8EB69B]">
          Overview
        </p>

        <h2 className="mt-1 text-xl font-bold text-[#DAF1DE]">
          {telemetry.binId}
        </h2>
      </div>

      {/* Cards */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Waste Level */}

        <div className="rounded-2xl border border-[#235347]/40 bg-[#163831] p-5 shadow-xl transition duration-200 hover:border-[#8EB69B]/40 hover:bg-[#235347]/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#8EB69B]">
                Waste Level
              </p>

              <p className={`mt-2 text-3xl font-bold ${levelColor}`}>
                {level}%
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#235347] text-xl">
              🗑️
            </div>
          </div>

          {/* Progress */}

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-[#8EB69B]">
                Capacity
              </span>

              <span className={levelColor}>
                {levelStatus}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#0B2B26]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${level}%` }}
              />
            </div>
          </div>
        </div>

        {/* Battery */}

        <div className="rounded-2xl border border-[#235347]/40 bg-[#163831] p-5 shadow-xl transition duration-200 hover:border-[#8EB69B]/40 hover:bg-[#235347]/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#8EB69B]">
                Battery
              </p>

              <p className="mt-2 text-3xl font-bold text-[#DAF1DE]">
                {telemetry.batteryPct}%
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#235347] text-xl">
              🔋
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-[#0B2B26]">
              <div
                className="h-full rounded-full bg-[#8EB69B] transition-all duration-500"
                style={{
                  width: `${Math.min(
                    Math.max(telemetry.batteryPct, 0),
                    100
                  )}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-[#8EB69B]">
              Solar power system
            </p>
          </div>
        </div>

        {/* Voltage */}

        <div className="rounded-2xl border border-[#235347]/40 bg-[#163831] p-5 shadow-xl transition duration-200 hover:border-[#8EB69B]/40 hover:bg-[#235347]/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#8EB69B]">
                Voltage
              </p>

              <p className="mt-2 text-3xl font-bold text-[#DAF1DE]">
                {telemetry.voltage.toFixed(1)}
                <span className="ml-1 text-base font-normal text-[#8EB69B]">
                  V
                </span>
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#235347] text-xl">
              ⚡
            </div>
          </div>

          <p className="mt-5 text-xs text-[#8EB69B]">
            Current battery voltage
          </p>
        </div>

        {/* Bin Status */}

        <div className="rounded-2xl border border-[#235347]/40 bg-[#163831] p-5 shadow-xl transition duration-200 hover:border-[#8EB69B]/40 hover:bg-[#235347]/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#8EB69B]">
                System Status
              </p>

              <p className="mt-2 text-2xl font-bold text-[#8EB69B]">
                Online
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#235347]">
              <span className="h-3 w-3 rounded-full bg-[#8EB69B] shadow-[0_0_10px_#8EB69B]" />
            </div>
          </div>

          <p className="mt-5 text-xs text-[#8EB69B]">
            Last update
          </p>

          <p className="mt-1 truncate text-sm text-[#DAF1DE]">
            {new Date(
              telemetry.timestamp
            ).toLocaleString("th-TH")}
          </p>
        </div>
      </div>
    </section>
  );
}