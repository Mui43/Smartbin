// src/app/settings/SettingsNotFound.tsx
import Link from "next/link";
import { Wrench, ArrowLeft, ShieldAlert } from "lucide-react";

export default function SettingsNotFound() {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center p-4 text-center lg:pl-64">
      {/* Container สไตล์ Green Dark Mode */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#235347]/50 bg-[#163831] p-8 shadow-2xl backdrop-blur-xl">
        {/* Glow Background */}
        <div className="pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full bg-[#8EB69B]/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />

        {/* Icon & Badge */}
        <div className="relative mb-6 flex justify-center">
          <div className="relative rounded-2xl border border-[#235347] bg-[#0B2B26] p-4 shadow-inner">
            <Wrench className="h-10 w-10 animate-pulse text-amber-400" />
            <div className="absolute -right-1 -top-1 rounded-full border border-red-500/40 bg-red-500/20 p-1">
              <ShieldAlert className="h-4 w-4 text-red-400" />
            </div>
          </div>
        </div>

        {/* Text Details */}
        <span className="mb-3 inline-block rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
          Under Maintenance
        </span>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-[#DAF1DE]">
          ไม่สามารถใช้งานหน้านี้ได้
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-[#8EB69B]">
          ระบบการตั้งค่า (Settings)
          กำลังอยู่ระหว่างการปรับปรุงและอัปเดตระบบความปลอดภัย
          ขออภัยในความไม่สะดวก
        </p>

        {/* Action Button */}
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8EB69B] px-5 py-3 text-sm font-semibold text-[#051F20] shadow-lg transition-all hover:bg-[#DAF1DE] active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับสู่หน้า Dashboard
        </Link>
      </div>
    </div>
  );
}
