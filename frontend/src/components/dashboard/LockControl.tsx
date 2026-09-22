"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, Unlock, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LockControl({ binId }: { binId: string }) {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");

  const canControl =
    session?.user?.role === "admin" || session?.user?.role === "staff";

  async function handleLock(action: "lock" | "unlock") {
    if (!session?.user?.accessToken) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/bins/${binId}/lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.accessToken}`,
        },
        body: JSON.stringify({
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message || "ไม่สามารถควบคุม Lock ได้");
        return;
      }

      setLocked(action === "lock");
    } catch (err) {
      console.error("Lock control error:", err);
      setError("ไม่สามารถเชื่อมต่อ Backend ได้");
    } finally {
      setLoading(false);
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
              flex
              h-14
              w-14
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              transition-all
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
            <p
              className={`mt-1 text-lg font-bold ${locked ? "text-emerald-400" : "text-slate-200"}`}
            >
              {locked ? "Locked" : "Unlocked"}
            </p>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      {canControl ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleLock("lock")}
            disabled={loading || locked}
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-emerald-500/30
              bg-emerald-500/10
              px-4
              py-3
              font-medium
              text-emerald-400
              transition
              hover:bg-emerald-500/20
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-40
              disabled:hover:bg-emerald-500/10
            "
          >
            {loading && locked ? (
              <Loader2 size={18} className="animate-spin shrink-0" />
            ) : (
              <Lock size={18} className="shrink-0" />
            )}
            <span>Lock</span>
          </button>

          <button
            onClick={() => handleLock("unlock")}
            disabled={loading || !locked}
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-[#212b3d]
              bg-[#212b3d]/50
              px-4
              py-3
              font-medium
              text-slate-200
              transition
              hover:bg-[#212b3d]
              hover:text-white
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {loading && !locked ? (
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

      {loading && (
        <p className="mt-3 text-center text-xs text-slate-400 animate-pulse">
          Sending command...
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center text-xs font-medium text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
