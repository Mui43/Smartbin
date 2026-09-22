"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Lock,
  LockOpen,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";

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
    <div className="rounded-2xl border border-[#235347]/40 bg-[#163831] p-5 shadow-xl sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#8EB69B]">
            Security
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#DAF1DE]">Bin Lock</h2>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#235347] text-[#8EB69B]">
          {locked ? (
            <Lock className="h-5 w-5 text-red-400" />
          ) : (
            <LockOpen className="h-5 w-5 text-[#8EB69B]" />
          )}
        </div>
      </div>

      {/* Status */}
      <div className="mt-6 rounded-xl border border-[#235347]/40 bg-[#0B2B26] p-5">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300 ${
              locked
                ? "bg-red-500/10 text-red-400"
                : "bg-[#8EB69B]/20 text-[#8EB69B]"
            }`}
          >
            {locked ? (
              <Lock className="h-7 w-7" />
            ) : (
              <LockOpen className="h-7 w-7" />
            )}
          </div>

          <div>
            <p className="text-sm text-[#8EB69B]">Current Status</p>

            <p className="mt-1 text-lg font-bold text-[#DAF1DE]">
              {locked ? "Locked" : "Unlocked"}
            </p>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      {canControl ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleLock("lock")}
            disabled={loading || locked}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#235347] bg-[#0B2B26] px-4 py-3 font-medium text-[#DAF1DE] transition hover:bg-[#235347] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Lock className="h-4 w-4 text-red-400" />
            <span>Lock</span>
          </button>

          <button
            onClick={() => handleLock("unlock")}
            disabled={loading || !locked}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#8EB69B] px-4 py-3 font-medium text-[#051F20] transition hover:bg-[#DAF1DE] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LockOpen className="h-4 w-4" />
            <span>Unlock</span>
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#235347]/40 bg-[#0B2B26] p-4 text-center text-sm text-[#8EB69B]">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>Your role does not have permission to control the lock.</span>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#8EB69B]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Sending command...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-red-400/10 p-3 text-center text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
