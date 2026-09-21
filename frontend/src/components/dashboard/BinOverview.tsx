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
        : "text-[#90AB8B]";

  const progressColor =
    level >= 90
      ? "bg-red-400"
      : level >= 75
        ? "bg-yellow-300"
        : "bg-[#90AB8B]";

  return (
    <section>
      {/* Header */}

      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-[#90AB8B]">
          Overview
        </p>

        <h2 className="mt-1 text-xl font-bold text-[#EBF4DD]">
          {telemetry.binId}
        </h2>
      </div>

      {/* Cards */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Waste Level */}

        <div className="rounded-2xl border border-[#5A7863]/40 bg-[#3B4953] p-5 shadow-xl transition duration-200 hover:border-[#90AB8B]/40 hover:bg-[#5A7863]/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#90AB8B]">
                Waste Level
              </p>

              <p className={`mt-2 text-3xl font-bold ${levelColor}`}>
                {level}%
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5A7863] text-xl">
              🗑️
            </div>
          </div>

          {/* Progress */}

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-[#90AB8B]">
                Capacity
              </span>

              <span className={levelColor}>
                {levelStatus}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#3B4953]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${level}%` }}
              />
            </div>
          </div>
        </div>

        {/* Battery */}

        <div className="rounded-2xl border border-[#5A7863]/40 bg-[#3B4953] p-5 shadow-xl transition duration-200 hover:border-[#90AB8B]/40 hover:bg-[#5A7863]/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#90AB8B]">
                Battery
              </p>

              <p className="mt-2 text-3xl font-bold text-[#EBF4DD]">
                {telemetry.batteryPct}%
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5A7863] text-xl">
              🔋
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-[#3B4953]">
              <div
                className="h-full rounded-full bg-[#90AB8B] transition-all duration-500"
                style={{
                  width: `${Math.min(
                    Math.max(telemetry.batteryPct, 0),
                    100
                  )}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-[#90AB8B]">
              Solar power system
            </p>
          </div>
        </div>

        {/* Voltage */}

        <div className="rounded-2xl border border-[#5A7863]/40 bg-[#3B4953] p-5 shadow-xl transition duration-200 hover:border-[#90AB8B]/40 hover:bg-[#5A7863]/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#90AB8B]">
                Voltage
              </p>

              <p className="mt-2 text-3xl font-bold text-[#EBF4DD]">
                {telemetry.voltage.toFixed(1)}
                <span className="ml-1 text-base font-normal text-[#90AB8B]">
                  V
                </span>
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5A7863] text-xl">
              ⚡
            </div>
          </div>

          <p className="mt-5 text-xs text-[#90AB8B]">
            Current battery voltage
          </p>
        </div>

        {/* Bin Status */}

        <div className="rounded-2xl border border-[#5A7863]/40 bg-[#3B4953] p-5 shadow-xl transition duration-200 hover:border-[#90AB8B]/40 hover:bg-[#5A7863]/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#90AB8B]">
                System Status
              </p>

              <p className="mt-2 text-2xl font-bold text-[#90AB8B]">
                Online
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5A7863]">
              <span className="h-3 w-3 rounded-full bg-[#90AB8B] shadow-[0_0_10px_#90AB8B]" />
            </div>
          </div>

          <p className="mt-5 text-xs text-[#90AB8B]">
            Last update
          </p>

          <p className="mt-1 truncate text-sm text-[#EBF4DD]">
            {new Date(
              telemetry.timestamp
            ).toLocaleString("th-TH")}
          </p>
        </div>
      </div>
    </section>
  );
}