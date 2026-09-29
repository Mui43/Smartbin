"use client";

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { BellRing, CheckCircle2, CircleAlert, Loader2, MessageCircle, RotateCcw, Send } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

type AlertSettings = {
  offlineAfterSeconds: number;
  lowBatteryPct: number;
  reminderIntervalMinutes: number;
};

type LineSettings = {
  tokenConfigured: boolean;
  webhookSecretConfigured: boolean;
  targetConfigured: boolean;
  targetId: string;
  source: "environment" | "settings";
  lastTestAt: string | null;
  lastTestStatus: "success" | "failure" | null;
  lastTestError: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const reminderOptions = [
  { value: 0, label: "ไม่ส่งซ้ำจนกว่าสถานะจะกลับมาปกติ" },
  { value: 15, label: "ทุก 15 นาที" },
  { value: 30, label: "ทุก 30 นาที" },
  { value: 60, label: "ทุก 1 ชั่วโมง" },
  { value: 180, label: "ทุก 3 ชั่วโมง" },
  { value: 1440, label: "ทุก 24 ชั่วโมง" },
];
const inputClass = "w-full rounded-xl border border-[#334155] bg-[#0a0d14] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 disabled:opacity-60";

function formatThaiTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })
    : "";
}

export default function NotificationControls({ token, isAdmin }: { token?: string; isAdmin: boolean }) {
  const [alerts, setAlerts] = useState<AlertSettings | null>(null);
  const [draft, setDraft] = useState({ offlineAfterSeconds: "60", lowBatteryPct: "20", reminderIntervalMinutes: "0" });
  const [line, setLine] = useState<LineSettings | null>(null);
  const [targetDraft, setTargetDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"alerts" | "line" | "test" | null>(null);
  const [error, setError] = useState("");
  const [alertError, setAlertError] = useState("");
  const [lineError, setLineError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch(`${API_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal,
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result?.error?.message || "โหลดการตั้งค่าการแจ้งเตือนไม่สำเร็จ");
      if (signal?.aborted) return;
      const settings = result.data.alerts as AlertSettings;
      const lineSettings = result.data.line as LineSettings;
      setAlerts(settings);
      setDraft({
        offlineAfterSeconds: String(settings.offlineAfterSeconds),
        lowBatteryPct: String(settings.lowBatteryPct),
        reminderIntervalMinutes: String(settings.reminderIntervalMinutes),
      });
      setLine(lineSettings);
      setTargetDraft(lineSettings.targetId || "");
      setAlertError("");
      setLineError("");
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "โหลดการตั้งค่าไม่สำเร็จ");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function saveAlerts() {
    if (!token || !alerts || !isAdmin || saving) return;
    const values = {
      offlineAfterSeconds: Number(draft.offlineAfterSeconds),
      lowBatteryPct: Number(draft.lowBatteryPct),
      reminderIntervalMinutes: Number(draft.reminderIntervalMinutes),
    };
    if (
      draft.offlineAfterSeconds.trim() === "" || !Number.isInteger(values.offlineAfterSeconds) ||
      values.offlineAfterSeconds < 30 || values.offlineAfterSeconds > 3600 ||
      draft.lowBatteryPct.trim() === "" || !Number.isInteger(values.lowBatteryPct) ||
      values.lowBatteryPct < 0 || values.lowBatteryPct > 100 ||
      !reminderOptions.some((option) => option.value === values.reminderIntervalMinutes)
    ) {
      setAlertError("กรุณาระบุเวลาออฟไลน์ 30–3600 วินาที และแบตเตอรี่ต่ำ 0–100%");
      return;
    }
    setSaving("alerts");
    setAlertError("");
    try {
      const response = await apiFetch(`${API_URL}/api/settings/alerts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result?.error?.message || "บันทึกเกณฑ์แจ้งเตือนไม่สำเร็จ");
      setAlerts(values);
      void Swal.fire({ title: "บันทึกสำเร็จ", text: "ปรับเกณฑ์การแจ้งเตือนแล้ว", icon: "success", confirmButtonColor: "#10b981", background: "#131822", color: "#ffffff" });
    } catch (cause) {
      setAlertError(cause instanceof Error ? cause.message : "บันทึกเกณฑ์แจ้งเตือนไม่สำเร็จ");
    } finally {
      setSaving(null);
    }
  }

  async function saveRecipient(targetId: string | null) {
    if (!token || !line || !isAdmin || saving) return;
    const normalized = targetId === null ? null : targetId.trim();
    if (normalized && !/^[UCR][0-9a-f]{32}$/i.test(normalized)) {
      setLineError("รหัสผู้รับต้องขึ้นต้นด้วย U, C หรือ R และตามด้วยอักขระ 32 หลัก");
      return;
    }
    setSaving("line");
    setLineError("");
    try {
      const response = await apiFetch(`${API_URL}/api/settings/line`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetId: normalized }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result?.error?.message || "บันทึกผู้รับ LINE ไม่สำเร็จ");
      setLine((current) => current && {
        ...current,
        targetId: result.data.targetId,
        targetConfigured: result.data.targetConfigured,
        source: result.data.source,
        lastTestAt: null,
        lastTestStatus: null,
        lastTestError: null,
      });
      setTargetDraft(result.data.targetId);
      void Swal.fire({ title: "บันทึกสำเร็จ", text: "อัปเดตผู้รับ LINE แล้ว กรุณาส่งข้อความทดสอบ", icon: "success", confirmButtonColor: "#10b981", background: "#131822", color: "#ffffff" });
    } catch (cause) {
      setLineError(cause instanceof Error ? cause.message : "บันทึกผู้รับ LINE ไม่สำเร็จ");
    } finally {
      setSaving(null);
    }
  }

  async function testLine() {
    if (!token || !line?.tokenConfigured || !line.targetConfigured || !isAdmin || saving || targetDraft.trim() !== line.targetId) return;
    setSaving("test");
    setLineError("");
    try {
      const response = await apiFetch(`${API_URL}/api/settings/line/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result?.error?.message || "ทดสอบ LINE ไม่สำเร็จ");
      setLine((current) => current && { ...current, lastTestAt: result.data.testedAt, lastTestStatus: "success", lastTestError: null });
      void Swal.fire({ title: "ส่งข้อความทดสอบสำเร็จ", text: `LINE ยอมรับข้อความที่ส่งถึง ${result.data.recipient}`, icon: "success", confirmButtonColor: "#10b981", background: "#131822", color: "#ffffff" });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "ทดสอบ LINE ไม่สำเร็จ";
      setLineError(message);
      setLine((current) => current && { ...current, lastTestAt: new Date().toISOString(), lastTestStatus: "failure", lastTestError: message });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><MessageCircle size={21} /></div>
          <div><h2 className="text-lg font-bold">การแจ้งเตือน LINE</h2><p className="mt-1 text-sm text-slate-400">ตรวจการตั้งค่า ผู้รับ และการส่งข้อความจริง</p></div>
        </div>
        {loading ? <p className="mt-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" />กำลังโหลด...</p> : line && (
          <>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <StatusLine label="Channel Access Token" ready={line.tokenConfigured} />
              <StatusLine label="ผู้รับข้อความ" ready={line.targetConfigured} />
              <StatusLine label="Webhook Secret" ready={line.webhookSecretConfigured} />
              <div className="flex items-center justify-between rounded-xl border border-[#293548] bg-[#0a0d14] px-3 py-2.5 text-xs">
                <span className="text-slate-400">ทดสอบล่าสุด</span>
                <span className={line.lastTestStatus === "success" ? "text-emerald-400" : line.lastTestStatus === "failure" ? "text-rose-400" : "text-slate-400"}>
                  {line.lastTestStatus === "success" ? "ส่งสำเร็จ" : line.lastTestStatus === "failure" ? "ส่งไม่สำเร็จ" : "ยังไม่ทดสอบ"}
                </span>
              </div>
            </div>
            {line.lastTestAt && <p className="mt-3 text-xs text-slate-400">ทดสอบล่าสุด: {formatThaiTime(line.lastTestAt)}</p>}
            {line.lastTestError && !lineError && <p className="mt-2 text-xs text-rose-400">{line.lastTestError}</p>}
            <div className="mt-5">
              <label htmlFor="line-target" className="text-sm font-medium text-slate-300">รหัสผู้รับ LINE</label>
              {isAdmin ? (
                <>
                  <input id="line-target" type="text" autoComplete="off" spellCheck={false} value={targetDraft} onChange={(event) => { setTargetDraft(event.target.value); setLineError(""); }} disabled={saving !== null} placeholder="U..., C... หรือ R..." className={`mt-2 font-mono ${inputClass}`} />
                  <p className="mt-2 text-xs text-slate-500">ใช้ LINE User ID, Group ID หรือ Room ID สำหรับข้อความแจ้งเตือนและการทดสอบ</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => saveRecipient(targetDraft)} disabled={saving !== null || targetDraft.trim() === line.targetId} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#0a0d14] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-[#293548] disabled:text-slate-400">บันทึกผู้รับ</button>
                    {line.source === "settings" && <button type="button" onClick={() => saveRecipient(null)} disabled={saving !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-[#334155] px-3 py-2 text-sm text-slate-300 hover:bg-[#212b3d] disabled:opacity-50"><RotateCcw size={14} />ใช้ค่าจากเซิร์ฟเวอร์</button>}
                    <button type="button" onClick={testLine} disabled={saving !== null || !line.tokenConfigured || !line.targetConfigured || targetDraft.trim() !== line.targetId} className="inline-flex items-center gap-1.5 rounded-lg border border-[#334155] px-4 py-2 text-sm font-semibold text-white hover:bg-[#212b3d] disabled:cursor-not-allowed disabled:opacity-50">{saving === "test" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}ส่งข้อความทดสอบ</button>
                  </div>
                </>
              ) : <p className="mt-2 rounded-xl border border-[#334155] bg-[#0a0d14] p-3 font-mono text-sm text-slate-300">{line.targetId || "ยังไม่กำหนด"}</p>}
              <p className="mt-3 text-xs text-slate-500">ผู้รับนี้ใช้สำหรับแจ้งเตือนอัตโนมัติ ส่วนสิทธิ์สั่งงานผ่าน LINE ตั้งค่าแยกบนเซิร์ฟเวอร์</p>
            </div>
            {lineError && <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-rose-400"><CircleAlert size={16} className="mt-0.5 shrink-0" />{lineError}</p>}
          </>
        )}
        {error && <p role="alert" className="mt-5 text-sm text-rose-400">{error}</p>}
      </section>

      <section className="rounded-2xl border border-[#212b3d] bg-[#131822] p-5 shadow-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400"><BellRing size={21} /></div>
          <div><h2 className="text-lg font-bold">เกณฑ์แจ้งเตือนระบบ</h2><p className="mt-1 text-sm text-slate-400">ใช้กับทุกถังและสถานะอุปกรณ์ในระบบ</p></div>
        </div>
        {loading ? <p className="mt-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" />กำลังโหลด...</p> : alerts && (
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block font-medium">แจ้งว่าออฟไลน์เมื่อไม่มีข้อมูลนาน (วินาที)</span>
              <input type="number" min="30" max="3600" step="1" value={draft.offlineAfterSeconds} onChange={(event) => { setDraft((current) => ({ ...current, offlineAfterSeconds: event.target.value })); setAlertError(""); }} disabled={!isAdmin || saving !== null} className={inputClass} />
              <span className="mt-1 block text-xs text-slate-500">มีผลกับการตรวจถังและอุปกรณ์ที่หยุดส่งสัญญาณ</span>
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block font-medium">แจ้งเตือนแบตเตอรี่ต่ำเมื่อเหลือไม่เกิน (%)</span>
              <input type="number" min="0" max="100" step="1" value={draft.lowBatteryPct} onChange={(event) => { setDraft((current) => ({ ...current, lowBatteryPct: event.target.value })); setAlertError(""); }} disabled={!isAdmin || saving !== null} className={inputClass} />
              <span className="mt-1 block text-xs text-slate-500">ต้องได้รับค่าแบตเตอรี่จริงจากอุปกรณ์จึงจะแจ้งเตือนได้ถูกต้อง</span>
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block font-medium">ส่งเตือนซ้ำขณะยังมีปัญหา</span>
              <select value={draft.reminderIntervalMinutes} onChange={(event) => { setDraft((current) => ({ ...current, reminderIntervalMinutes: event.target.value })); setAlertError(""); }} disabled={!isAdmin || saving !== null} className={inputClass}>
                {reminderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <span className="mt-1 block text-xs text-slate-500">หากส่ง LINE ไม่สำเร็จ ระบบจะลองใหม่ทุก 1 นาที</span>
            </label>
            {alertError && <p role="alert" className="flex items-start gap-1.5 text-sm text-rose-400"><CircleAlert size={16} className="mt-0.5 shrink-0" />{alertError}</p>}
            {isAdmin ? (
              <button type="button" onClick={saveAlerts} disabled={saving !== null || (draft.offlineAfterSeconds === String(alerts.offlineAfterSeconds) && draft.lowBatteryPct === String(alerts.lowBatteryPct) && draft.reminderIntervalMinutes === String(alerts.reminderIntervalMinutes))} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#0a0d14] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-[#293548] disabled:text-slate-400">
                {saving === "alerts" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                บันทึกเกณฑ์
              </button>
            ) : <p className="text-xs text-slate-500">เฉพาะผู้ดูแลระบบที่แก้ไขได้</p>}
          </div>
        )}
        {error && <p role="alert" className="mt-5 text-sm text-rose-400">{error}</p>}
      </section>
    </div>
  );
}

function StatusLine({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[#293548] bg-[#0a0d14] px-3 py-2.5 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={ready ? "font-semibold text-emerald-400" : "font-semibold text-amber-400"}>{ready ? "กำหนดแล้ว" : "ยังไม่กำหนด"}</span>
    </div>
  );
}
