"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Lock, Unlock, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LockControl({ binId }: { binId: string }) {
  const { data: session } = useSession();

  const [loadingAction, setLoadingAction] = useState<"lock" | "unlock" | null>(
    null,
  );
  const [locked, setLocked] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState("");

  const targetStateRef = useRef<boolean | null>(null); // 🟢 เก็บค่าเป้าหมายที่ผู้ใช้กดล่าสุด
  const waitingSince = useRef<number | null>(null);
  const accessToken = session?.user?.accessToken;

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    const controller = new AbortController();

    async function refresh() {
      try {
        const response = await fetch(
          `${API_URL}/api/bins/${encodeURIComponent(binId)}/lock`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const result = await response.json();
        if (!active) return;

        if (!response.ok || !result.success) {
          setOnline(false);
          setError(result?.error?.message || "ไม่สามารถโหลดสถานะล็อกได้");
          return;
        }

        // 🟢 แปลงสถานะจาก Backend
        const rawState = String(result.data?.state ?? "").toLowerCase();
        const isBackendLocked =
          rawState === "on" ||
          rawState === "lock" ||
          rawState === "locked" ||
          rawState === "true" ||
          rawState === "1";
        const isBackendUnlocked =
          rawState === "off" ||
          rawState === "unlock" ||
          rawState === "unlocked" ||
          rawState === "false" ||
          rawState === "0";

        const backendState = isBackendLocked
          ? true
          : isBackendUnlocked
            ? false
            : null;
        const isPendingFromBackend = Boolean(result.data?.pendingCommand);

        console.log("🔍 Polling Status:", {
          rawState,
          backendState,
          isPendingFromBackend,
          currentTarget: targetStateRef.current,
        });

        setOnline(Boolean(result.data?.online));
        setPending(isPendingFromBackend);

        // แสดงเฉพาะสถานะที่ ESP32 รายงานจริง ระหว่างรอคำสั่งให้ใช้ป้ายรอยืนยัน
        setLocked(backendState);
        if (targetStateRef.current !== null) {
          if (
            backendState === targetStateRef.current &&
            !isPendingFromBackend
          ) {
            targetStateRef.current = null;
            waitingSince.current = null;
          }
        }

        // กรณีหมดเวลา 30 วิแล้ว ESP32 ยังไม่ตอบกลับ
        if (waitingSince.current && Date.now() - waitingSince.current > 30000) {
          setError("ยังไม่ได้รับการยืนยันจาก ESP32 กรุณาตรวจการเชื่อมต่อ");
          targetStateRef.current = null;
          waitingSince.current = null;
        }
      } catch (err: any) {
        if (active && err.name !== "AbortError") {
          setOnline(false);
          setError("ไม่สามารถโหลดสถานะจาก Backend ได้");
        }
      }
    }

    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 2000);

    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [binId, accessToken]);

  const canControl =
    session?.user?.role === "admin" || session?.user?.role === "staff";

  async function handleLock(action: "lock" | "unlock") {
    if (!session?.user?.accessToken) return;

    const isLocking = action === "lock";

    setLoadingAction(action);
    setError("");

    targetStateRef.current = isLocking;
    setPending(true);
    waitingSince.current = Date.now();

    try {
      const response = await fetch(`${API_URL}/api/bins/${encodeURIComponent(binId)}/lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.accessToken}`,
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // ถ้ายิง API ไม่สำเร็จ คืนค่ากลับ
        targetStateRef.current = null;
        setPending(false);
        setError(result?.error?.message || "ไม่สามารถควบคุม Lock ได้");
      }
    } catch (err) {
      console.error("Lock control error:", err);
      targetStateRef.current = null;
      setPending(false);
      setError("ไม่สามารถเชื่อมต่อ Backend ได้");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
            Security
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
            Bin Lock
          </h2>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14] text-emerald-400">
          {locked ? (
            <Lock size={20} className="shrink-0" />
          ) : (
            <Unlock size={20} className="shrink-0" />
          )}
        </div>
      </div>

      {/* Status Box */}
      <div className="mt-6 rounded-xl border border-[#212b3d] bg-[#0a0d14] p-5">
        <div className="flex items-center gap-4">
          <div
            className={`
              flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-all
              ${
                locked
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-inner"
                  : "border-slate-700/50 bg-[#131822] text-slate-400"
              }
            `}
          >
            {locked ? (
              <Lock size={28} className="shrink-0" />
            ) : (
              <Unlock size={28} className="shrink-0" />
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400">Current Status</p>
            <div className="mt-1 flex items-center gap-2">
              <p
                className={`text-lg font-bold ${
                  locked ? "text-emerald-400" : "text-slate-200"
                }`}
              >
                {locked === null
                  ? "ยังไม่มีสถานะ"
                  : locked
                    ? "Locked"
                    : "Unlocked"}
              </p>

              {(pending || targetStateRef.current !== null) && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20 animate-pulse">
                  รอยืนยัน...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      {canControl ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleLock("lock")}
            disabled={loadingAction !== null || pending || !online}
            className="
              flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30
              bg-emerald-500/10 px-4 py-3 font-medium text-emerald-400 transition
              hover:bg-emerald-500/20 active:scale-[0.98] disabled:cursor-not-allowed
              disabled:opacity-40 disabled:hover:bg-emerald-500/10
            "
          >
            {loadingAction === "lock" ? (
              <Loader2 size={18} className="animate-spin shrink-0" />
            ) : (
              <Lock size={18} className="shrink-0" />
            )}
            <span>Lock</span>
          </button>

          <button
            onClick={() => handleLock("unlock")}
            disabled={loadingAction !== null || pending || !online}
            className="
              flex items-center justify-center gap-2 rounded-xl border border-[#212b3d]
              bg-[#212b3d]/50 px-4 py-3 font-medium text-slate-200 transition
              hover:bg-[#212b3d] hover:text-white active:scale-[0.98]
              disabled:cursor-not-allowed disabled:opacity-40
            "
          >
            {loadingAction === "unlock" ? (
              <Loader2 size={18} className="animate-spin shrink-0" />
            ) : (
              <Unlock size={18} className="shrink-0" />
            )}
            <span>Unlock</span>
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center text-xs text-amber-400/90">
          Your role does not have permission to control the lock.
        </div>
      )}

      {!online && (
        <p className="mt-3 text-xs text-amber-400">Servo Lock ยังไม่ออนไลน์</p>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center text-xs font-medium text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
