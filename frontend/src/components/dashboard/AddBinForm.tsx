"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

interface NewBin {
  binId: string;
  name: string;
  location: string;
}

const inputClass = "mt-2 w-full rounded-lg border border-[#293548] bg-[#0a0d14] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 disabled:opacity-60";

export default function AddBinForm({ accessToken, onCancel, onCreated }: {
  accessToken: string;
  onCancel: () => void;
  onCreated: (bin: NewBin) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const binId = String(form.get("binId") || "").trim();
    const name = String(form.get("name") || "").trim();
    const location = String(form.get("location") || "").trim();
    const thresholdPct = Number(form.get("thresholdPct"));

    if (!/^[A-Za-z0-9_-]+$/.test(binId) || !name || !location ||
        !Number.isFinite(thresholdPct) || thresholdPct < 0 || thresholdPct > 100) {
      setError("กรุณากรอกข้อมูลให้ครบ และระบุระดับแจ้งเตือนระหว่าง 0–100%");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/bins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ binId, name, location, thresholdPct, mqttTopic: `bins/${binId}/telemetry` }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(response.status === 409
          ? "รหัสถังนี้มีอยู่แล้ว กรุณาใช้รหัสอื่น"
          : result?.error?.message || "ไม่สามารถเพิ่มถังได้");
      }
      onCreated(result.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "ไม่สามารถเชื่อมต่อ backend ได้");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-2xl border border-[#212b3d] bg-[#131822] p-5">
      <h3 className="mb-4 font-semibold text-white">เพิ่มถังขยะ</h3>
      <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300">
          รหัสถัง
          <input autoFocus required name="binId" placeholder="A-002" pattern="[A-Za-z0-9_-]+" title="ใช้ตัวอักษรอังกฤษ ตัวเลข ขีดกลาง หรือขีดล่าง" className={inputClass} />
        </label>
        <label className="text-sm text-slate-300">
          ชื่อถัง
          <input required name="name" placeholder="Smartbin2" className={inputClass} />
        </label>
        <label className="text-sm text-slate-300">
          ตำแหน่งติดตั้ง
          <input required name="location" placeholder="อาคาร 2" className={inputClass} />
        </label>
        <label className="text-sm text-slate-300">
          ระดับขยะที่แจ้งเตือน (%)
          <input required type="number" name="thresholdPct" min="0" max="100" defaultValue="85" className={inputClass} />
        </label>
      </fieldset>
      {error && <p role="alert" className="mt-4 text-sm text-rose-400">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-[#334155] px-4 py-2 text-sm text-slate-300 transition hover:bg-[#212b3d] disabled:opacity-50">ยกเลิก</button>
        <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#0a0d14] transition hover:bg-emerald-400 disabled:opacity-50">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "กำลังบันทึก..." : "บันทึกถัง"}
        </button>
      </div>
    </form>
  );
}
