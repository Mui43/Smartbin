"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Swal from "sweetalert2";
import { Bell, Check, ExternalLink, Loader2, MapPin, RefreshCw, Settings2, ShieldCheck } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { apiFetch } from "@/lib/apiFetch";
import NotificationControls from "@/components/settings/NotificationControls";

type BinSetting = {
  binId: string;
  name: string;
  location: string;
  thresholdPct: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const token = session?.user?.accessToken;
  const isAdmin = session?.user?.role === "admin";
  const [bins, setBins] = useState<BinSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const loadBins = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch(`${API_URL}/api/bins`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal,
      });
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result?.error?.message || "ไม่สามารถโหลดการตั้งค่าถังได้");
      }
      if (signal?.aborted) return;
      const list = result.data as BinSetting[];
      setBins(list);
      setDrafts(Object.fromEntries(list.map((bin) => [bin.binId, String(bin.thresholdPct)])));
      setRowError({});
    } catch (cause) {
      if (!signal?.aborted) {
        setError(cause instanceof Error ? cause.message : "ไม่สามารถโหลดการตั้งค่าถังได้");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    if (status !== "loading") void loadBins(controller.signal);
    return () => controller.abort();
  }, [status, loadBins]);

  async function saveThreshold(bin: BinSetting) {
    if (!token || !isAdmin || savingId) return;
    const draft = drafts[bin.binId]?.trim() ?? "";
    const thresholdPct = Number(draft);
    if (draft === "" || !Number.isInteger(thresholdPct) || thresholdPct < 0 || thresholdPct > 100) {
      setRowError((current) => ({ ...current, [bin.binId]: "กรุณาระบุจำนวนเต็มตั้งแต่ 0 ถึง 100%" }));
      return;
    }
    if (thresholdPct === bin.thresholdPct) return;

    setSavingId(bin.binId);
    setRowError((current) => ({ ...current, [bin.binId]: "" }));
    try {
      const response = await apiFetch(`${API_URL}/api/bins/${encodeURIComponent(bin.binId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ thresholdPct }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message || "บันทึกระดับแจ้งเตือนไม่สำเร็จ");
      }
      setBins((current) => current.map((item) =>
        item.binId === bin.binId ? { ...item, thresholdPct } : item,
      ));
      void Swal.fire({
        title: "บันทึกสำเร็จ",
        text: `ตั้งค่าการแจ้งเตือนของ ${bin.name} ที่ ${thresholdPct}% แล้ว`,
        icon: "success",
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#10b981",
        background: "#131822",
        color: "#ffffff",
      });
    } catch (cause) {
      setRowError((current) => ({
        ...current,
        [bin.binId]: cause instanceof Error ? cause.message : "ไม่สามารถบันทึกการตั้งค่าได้",
      }));
    } finally {
      setSavingId(null);
    }
  }

  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-[#0a0d14] text-white">
        <Sidebar />
        <div className="flex min-h-screen items-center justify-center p-6 lg:ml-64">
          <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-8 text-center">
            <p className="text-lg font-semibold">กรุณาเข้าสู่ระบบเพื่อดูการตั้งค่า</p>
            <Link href="/login" className="mt-4 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#0a0d14] hover:bg-emerald-400">ไปหน้าเข้าสู่ระบบ</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0d14] text-white">
      <Sidebar />
      <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Monitoring</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
            <p className="mt-1 text-sm text-slate-400">จัดการ LINE และเกณฑ์แจ้งเตือนของถังและอุปกรณ์</p>
          </div>
          <Header hideTitle />
        </div>

        <section className="mt-6 rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <Bell size={21} />
              </div>
              <div>
                <h2 className="text-lg font-bold">ระดับแจ้งเตือนถังใกล้เต็ม</h2>
                <p className="mt-1 text-sm text-slate-400">เมื่อระดับขยะถึงค่าที่กำหนด ระบบจะสร้างการแจ้งเตือนของถังนั้น</p>
              </div>
            </div>
            <button type="button" onClick={() => loadBins()} disabled={loading || savingId !== null || !token} className="inline-flex items-center gap-2 rounded-xl border border-[#334155] px-3 py-2 text-sm text-slate-300 transition hover:bg-[#212b3d] disabled:opacity-50">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              รีเฟรช
            </button>
          </div>

          {error && <p role="alert" className="mt-5 rounded-xl border border-rose-900/50 bg-rose-950/30 p-3 text-sm text-rose-400">{error}</p>}
          {!isAdmin && status === "authenticated" && (
            <p className="mt-5 rounded-xl border border-[#334155] bg-[#0a0d14] p-3 text-sm text-slate-400">
              บัญชีนี้ดูการตั้งค่าได้ หากต้องการแก้ไขให้ติดต่อผู้ดูแลระบบ
            </p>
          )}

          {loading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 size={17} className="animate-spin" />กำลังโหลดการตั้งค่า...</div>
          ) : bins.length === 0 && !error ? (
            <p className="mt-6 rounded-xl border border-dashed border-[#334155] p-6 text-center text-sm text-slate-400">ยังไม่มีถังขยะในระบบ</p>
          ) : (
            <div className="mt-6 grid gap-3">
              {bins.map((bin) => {
                const draft = drafts[bin.binId] ?? String(bin.thresholdPct);
                const changed = draft !== String(bin.thresholdPct);
                return (
                  <div key={bin.binId} className="rounded-xl border border-[#293548] bg-[#0a0d14] p-4 transition hover:border-[#3b4d62]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-white">{bin.name}</h3>
                          <span className="rounded-md bg-[#212b3d] px-2 py-0.5 font-mono text-xs text-slate-300">{bin.binId}</span>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><MapPin size={13} />{bin.location}</p>
                      </div>
                      {isAdmin ? (
                        <div className="flex items-center gap-2">
                          <label htmlFor={`threshold-${bin.binId}`} className="text-xs text-slate-400">แจ้งเตือนที่</label>
                          <div className="relative">
                            <input
                              id={`threshold-${bin.binId}`}
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              inputMode="numeric"
                              value={draft}
                              onChange={(event) => {
                                setDrafts((current) => ({ ...current, [bin.binId]: event.target.value }));
                                setRowError((current) => ({ ...current, [bin.binId]: "" }));
                              }}
                              disabled={savingId !== null}
                              className="w-24 rounded-lg border border-[#334155] bg-[#131822] py-2 pl-3 pr-7 text-right text-sm font-semibold text-white outline-none transition focus:border-emerald-500 disabled:opacity-60"
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => saveThreshold(bin)}
                            disabled={!changed || savingId !== null}
                            className="inline-flex h-9 min-w-20 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-[#0a0d14] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-[#293548] disabled:text-slate-400"
                          >
                            {savingId === bin.binId ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                            บันทึก
                          </button>
                        </div>
                      ) : (
                        <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-400">{bin.thresholdPct}%</span>
                      )}
                    </div>
                    {rowError[bin.binId] && <p role="alert" className="mt-2 text-xs text-rose-400">{rowError[bin.binId]}</p>}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#293548] pt-4 text-xs text-slate-400">
            <span>ค่าเริ่มต้นของถังใหม่คือ 85% · เมื่อถังเต็ม 100% ระบบจะแจ้งเตือนเต็มถัง</span>
            <Link href="/notifications" className="inline-flex items-center gap-1 text-emerald-400 hover:underline">ดูการแจ้งเตือน <ExternalLink size={13} /></Link>
          </div>
        </section>

        <NotificationControls token={token} isAdmin={isAdmin} />

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#334155] bg-[#0a0d14] text-emerald-400"><ShieldCheck size={21} /></div>
              <div>
                <h2 className="font-bold">บัญชีผู้ใช้</h2>
                <p className="text-xs text-slate-400">ข้อมูลของบัญชีที่เข้าสู่ระบบ</p>
              </div>
            </div>
            <dl className="mt-5 divide-y divide-[#293548] text-sm">
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">ชื่อ</dt><dd className="text-right font-medium">{session?.user?.name || "—"}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">อีเมล</dt><dd className="break-all text-right font-medium">{session?.user?.email || "—"}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">สิทธิ์</dt><dd className="text-right font-medium capitalize">{session?.user?.role || "—"}</dd></div>
            </dl>
          </div>
          <div className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#334155] bg-[#0a0d14] text-emerald-400"><Settings2 size={21} /></div>
              <div>
                <h2 className="font-bold">ข้อมูลระบบ</h2>
                <p className="text-xs text-slate-400">การแสดงผลที่ใช้อยู่</p>
              </div>
            </div>
            <dl className="mt-5 divide-y divide-[#293548] text-sm">
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">เขตเวลา</dt><dd className="text-right font-medium">ประเทศไทย (UTC+7)</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">ข้อมูลถัง</dt><dd className="text-right font-medium">{bins.length} ถัง</dd></div>
            </dl>
            <Link href="/devices" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:underline">จัดการอุปกรณ์ <ExternalLink size={14} /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
