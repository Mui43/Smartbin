"use client";

interface TelemetryData {
  batteryPct: number;
  voltage: number;
}

export default function SolarBattery({
  telemetry,
}: {
  telemetry: TelemetryData;
}) {
  const battery = Math.min(
    Math.max(telemetry.batteryPct, 0),
    100
  );

  const batteryStatus =
    battery <= 20
      ? "Low"
      : battery <= 50
        ? "Medium"
        : "Good";

  const batteryColor =
    battery <= 20
      ? "text-red-400"
      : battery <= 50
        ? "text-yellow-300"
        : "text-[#8EB69B]";

  const batteryBar =
    battery <= 20
      ? "bg-red-400"
      : battery <= 50
        ? "bg-yellow-300"
        : "bg-[#8EB69B]";

  return (
    <div className="rounded-2xl border border-[#235347]/40 bg-[#163831] p-5 shadow-xl sm:p-6">
      {/* Header */}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#8EB69B]">
            Power
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#DAF1DE]">
            Solar & Battery
          </h2>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#235347] text-xl">
          ☀️
        </div>
      </div>

      {/* Battery */}

      <div className="mt-6 rounded-xl border border-[#235347]/40 bg-[#0B2B26] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#8EB69B]">
            Battery Level
          </span>

          <span className={`font-semibold ${batteryColor}`}>
            {batteryStatus}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <span className={`text-4xl font-bold ${batteryColor}`}>
            {battery}%
          </span>

          <span className="text-sm text-[#8EB69B]">
            Battery
          </span>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#051F20]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${batteryBar}`}
            style={{ width: `${battery}%` }}
          />
        </div>
      </div>

      {/* Voltage */}

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#235347]/40 bg-[#0B2B26] p-4">
          <p className="text-xs text-[#8EB69B]">
            Voltage
          </p>

          <p className="mt-2 text-xl font-bold text-[#DAF1DE]">
            {telemetry.voltage.toFixed(1)}
            <span className="ml-1 text-sm font-normal text-[#8EB69B]">
              V
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-[#235347]/40 bg-[#0B2B26] p-4">
          <p className="text-xs text-[#8EB69B]">
            Power Source
          </p>

          <p className="mt-2 text-xl font-bold text-[#8EB69B]">
            Solar
          </p>
        </div>
      </div>
    </div>
  );
}