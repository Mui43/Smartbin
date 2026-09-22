"use client";

import Link from "next/link";
import { Settings, Wrench, ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
      {/* Icon Graphic Container */}
      <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-[#212b3d] bg-[#131822] shadow-2xl">
        <Settings className="h-12 w-12 text-slate-500 animate-spin-slow" />
        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-[#0a0d14] shadow-lg">
          <Wrench size={16} />
        </div>
      </div>

      {/* Title & Subtitle */}
      <span className="mt-8 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
        Feature Under Development
      </span>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Settings Coming Soon
      </h1>

      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
        เรากำลังพัฒนาหน้าระบบการตั้งค่าเพื่อเพิ่มประสิทธิภาพในการจัดการถังขยะอัจฉริยะของคุณ
        โปรดติดตามการอัปเดตในเร็วๆ นี้!
      </p>

      {/* Action Button */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl border border-[#212b3d] bg-[#131822] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#212b3d] active:scale-95"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
