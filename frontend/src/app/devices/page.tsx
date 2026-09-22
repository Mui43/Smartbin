"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Swal from "sweetalert2";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  MapPin,
  Radio,
  Gauge,
  BarChart2,
  Battery,
  Zap,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

// สไตล์การแจ้งเตือน SweetAlert2 สำหรับ Dark Theme
const darkSwal = Swal.mixin({
  background: "#2C2E3A",
  color: "#FFFFFF",
  confirmButtonColor: "#0A21C0",
  cancelButtonColor: "#4B5563",
});

interface Bin {
  _id?: string;
  binId: string;
  name: string;
  location: string;
  mqttTopic: string;
  thresholdPct: number;

  level?: number;
  batteryPct?: number;
  voltage?: number;
  lastSeen?: string;
}

interface BinForm {
  binId: string;
  name: string;
  location: string;
  mqttTopic: string;
  thresholdPct: number;
}

const API_URL = "http://localhost:4000";

const emptyForm: BinForm = {
  binId: "",
  name: "",
  location: "",
  mqttTopic: "",
  thresholdPct: 85,
};

export default function DevicesPage() {
  const { data: session, status } = useSession();

  const [bins, setBins] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingBin, setEditingBin] = useState<Bin | null>(null);

  const [form, setForm] = useState<BinForm>(emptyForm);

  const [saving, setSaving] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  async function loadBins() {
    if (!session?.user?.accessToken) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/bins`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message || "ไม่สามารถโหลดข้อมูล Bin ได้",
        );
      }

      if (result.success) {
        setBins(result.data);
      }
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูล Bin ได้",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user?.accessToken) {
      loadBins();
    }
  }, [session]);

  function openAddModal() {
    setEditingBin(null);

    setForm({
      ...emptyForm,
    });

    setShowModal(true);
  }

  function openEditModal(bin: Bin) {
    setEditingBin(bin);

    setForm({
      binId: bin.binId,
      name: bin.name,
      location: bin.location,
      mqttTopic: bin.mqttTopic,
      thresholdPct: bin.thresholdPct,
    });

    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingBin(null);
    setForm({
      ...emptyForm,
    });
  }

  function handleChange(field: keyof BinForm, value: string | number) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!session?.user?.accessToken) {
      darkSwal.fire({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "กรุณาเข้าสู่ระบบ",
      });
      return;
    }

    if (!isAdmin) {
      darkSwal.fire({
        icon: "error",
        title: "ไม่มีสิทธิ์ access",
        text: "คุณไม่มีสิทธิ์จัดการ Bin",
      });
      return;
    }

    if (
      !form.binId.trim() ||
      !form.name.trim() ||
      !form.location.trim() ||
      !form.mqttTopic.trim()
    ) {
      darkSwal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบถ้วน",
        text: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
      });
      return;
    }

    if (form.thresholdPct < 0 || form.thresholdPct > 100) {
      darkSwal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ถูกต้อง",
        text: "Threshold ต้องอยู่ระหว่าง 0 - 100",
      });
      return;
    }

    try {
      setSaving(true);

      const isEditing = !!editingBin;

      const url = isEditing
        ? `${API_URL}/api/bins/${editingBin.binId}`
        : `${API_URL}/api/bins`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.accessToken}`,
        },
        body: JSON.stringify({
          binId: form.binId.trim(),
          name: form.name.trim(),
          location: form.location.trim(),
          mqttTopic: form.mqttTopic.trim(),
          thresholdPct: Number(form.thresholdPct),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error?.message || "ไม่สามารถบันทึกข้อมูลได้");
      }

      closeModal();

      await darkSwal.fire({
        icon: "success",
        title: "สำเร็จ!",
        text: isEditing ? "แก้ไข Bin สำเร็จ" : "เพิ่ม Bin สำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });

      await loadBins();
    } catch (error) {
      console.error(error);

      darkSwal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(bin: Bin) {
    if (!session?.user?.accessToken) {
      darkSwal.fire({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "กรุณาเข้าสู่ระบบ",
      });
      return;
    }

    if (!isAdmin) {
      darkSwal.fire({
        icon: "error",
        title: "ไม่มีสิทธิ์ access",
        text: "คุณไม่มีสิทธิ์ลบ Bin",
      });
      return;
    }

    const confirmResult = await darkSwal.fire({
      title: "ยืนยันการลบ?",
      text: `ต้องการลบ Bin "${bin.name}" (${bin.binId}) หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#4B5563",
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}/api/bins/${bin.binId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error?.message || "ไม่สามารถลบ Bin ได้");
      }

      await darkSwal.fire({
        icon: "success",
        title: "ลบสำเร็จ!",
        text: "ลบ Bin เรียบร้อยแล้ว",
        timer: 1500,
        showConfirmButton: false,
      });

      await loadBins();
    } catch (error) {
      console.error(error);

      darkSwal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text:
          error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบ Bin",
      });
    }
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#141619] text-white">
        <Sidebar />

        <div className="ml-64 p-8">
          <Header />

          <div className="rounded-xl bg-[#2C2E3A] p-6 text-gray-400">
            กำลังตรวจสอบสิทธิ์...
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-[#141619] text-white">
        <Sidebar />

        <div className="ml-64 p-8">
          <Header />

          <div className="rounded-xl bg-[#2C2E3A] p-6 text-gray-400">กรุณาเข้าสู่ระบบ</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#141619] text-white">
      <Sidebar />

      <div className="ml-64 p-8">
        <Header />

        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Devices Management</h2>

            <p className="mt-1 text-sm text-gray-400">
              จัดการข้อมูลถังขยะอัจฉริยะ
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 rounded-lg bg-[#0A21C0] px-5 py-3 font-medium transition hover:bg-[#050A44]"
            >
              <Plus className="h-5 w-5" />
              เพิ่ม Bin
            </button>
          )}
        </div>

        {/* Permission Info */}
        {!isAdmin && (
          <div className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-300">
            Role ของคุณคือ <strong>{session.user.role}</strong> สามารถดูข้อมูล
            Bin ได้ แต่ไม่มีสิทธิ์ เพิ่ม แก้ไข หรือลบ Bin
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Loading / Bins Grid */}
        {loading ? (
          <DevicesSkeleton />
        ) : bins.length === 0 ? (
          <div className="rounded-xl bg-[#2C2E3A] p-8 text-center">
            <p className="text-gray-400">ยังไม่มี Bin ในระบบ</p>

            {isAdmin && (
              <button
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0A21C0] px-5 py-2"
              >
                <Plus className="h-4 w-4" />
                เพิ่ม Bin แรก
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {bins.map((bin) => (
              <BinCard
                key={bin.binId}
                bin={bin}
                isAdmin={isAdmin}
                onEdit={() => openEditModal(bin)}
                onDelete={() => handleDelete(bin)}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-[#2C2E3A] p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    {editingBin ? "แก้ไข Bin" : "เพิ่ม Bin"}
                  </h3>

                  <p className="mt-1 text-sm text-gray-400">
                    กรอกข้อมูลของ Smart Bin
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Bin ID */}
                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Bin ID
                  </label>

                  <input
                    type="text"
                    value={form.binId}
                    onChange={(e) => handleChange("binId", e.target.value)}
                    disabled={!!editingBin}
                    placeholder="A-001"
                    className="w-full rounded-lg border border-white/10 bg-[#141619] px-4 py-3 outline-none focus:border-[#0A21C0] disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  {editingBin && (
                    <p className="mt-1 text-xs text-gray-500">
                      Bin ID ไม่สามารถแก้ไขได้
                    </p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    ชื่อ Bin
                  </label>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Bin A-001"
                    className="w-full rounded-lg border border-white/10 bg-[#141619] px-4 py-3 outline-none focus:border-[#0A21C0]"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Location
                  </label>

                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="Building A"
                    className="w-full rounded-lg border border-white/10 bg-[#141619] px-4 py-3 outline-none focus:border-[#0A21C0]"
                  />
                </div>

                {/* MQTT Topic */}
                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    MQTT Topic
                  </label>

                  <input
                    type="text"
                    value={form.mqttTopic}
                    onChange={(e) => handleChange("mqttTopic", e.target.value)}
                    placeholder="bins/A-001"
                    className="w-full rounded-lg border border-white/10 bg-[#141619] px-4 py-3 outline-none focus:border-[#0A21C0]"
                  />
                </div>

                {/* Threshold */}
                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Full Threshold (%)
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.thresholdPct}
                    onChange={(e) =>
                      handleChange("thresholdPct", Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#141619] px-4 py-3 outline-none focus:border-[#0A21C0]"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-[#141619] px-4 py-3 text-gray-300 hover:bg-black"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-[#0A21C0] px-4 py-3 font-medium hover:bg-[#050A44] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "กำลังบันทึก..."
                      : editingBin
                        ? "บันทึกการแก้ไข"
                        : "เพิ่ม Bin"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* =========================
   Devices Skeleton Component
========================= */

function DevicesSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl bg-[#2C2E3A] p-6">
          {/* Header Skeleton */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Icon Box */}
              <div className="h-12 w-12 rounded-xl bg-white/10" />
              {/* Name & ID */}
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-white/10" />
                <div className="h-3 w-16 rounded bg-white/10" />
              </div>
            </div>
            {/* Status Badge */}
            <div className="h-6 w-16 rounded-full bg-white/10" />
          </div>

          {/* Info Rows Skeleton */}
          <div className="mt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="h-4 w-20 rounded bg-white/10" />
                <div className="h-4 w-24 rounded bg-white/10" />
              </div>
            ))}
          </div>

          {/* Actions Skeleton */}
          <div className="mt-6 flex gap-3 border-t border-white/10 pt-5">
            <div className="h-9 flex-1 rounded-lg bg-white/10" />
            <div className="h-9 flex-1 rounded-lg bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================
   Bin Card
========================= */

function BinCard({
  bin,
  isAdmin,
  onEdit,
  onDelete,
}: {
  bin: Bin;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isOnline = bin.lastSeen
    ? Date.now() - new Date(bin.lastSeen).getTime() < 60_000
    : false;

  return (
    <div className="rounded-2xl bg-[#2C2E3A] p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#050A44] text-[#DAF1DE]">
            <Trash2 className="h-6 w-6" />
          </div>

          <div>
            <h3 className="font-bold">{bin.name}</h3>

            <p className="text-sm text-gray-400">{bin.binId}</p>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs ${
            isOnline
              ? "bg-green-500/10 text-green-400"
              : "bg-gray-500/10 text-gray-400"
          }`}
        >
          ● {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      {/* Info */}
      <div className="mt-6 space-y-3">
        <InfoRow
          icon={<MapPin className="h-4 w-4 text-gray-400" />}
          label="Location"
          value={bin.location}
        />

        <InfoRow
          icon={<Radio className="h-4 w-4 text-gray-400" />}
          label="MQTT"
          value={bin.mqttTopic}
        />

        <InfoRow
          icon={<Gauge className="h-4 w-4 text-gray-400" />}
          label="Threshold"
          value={`${bin.thresholdPct}%`}
        />

        <InfoRow
          icon={<BarChart2 className="h-4 w-4 text-gray-400" />}
          label="Level"
          value={bin.level !== undefined ? `${bin.level}%` : "-"}
        />

        <InfoRow
          icon={<Battery className="h-4 w-4 text-gray-400" />}
          label="Battery"
          value={bin.batteryPct !== undefined ? `${bin.batteryPct}%` : "-"}
        />

        <InfoRow
          icon={<Zap className="h-4 w-4 text-gray-400" />}
          label="Voltage"
          value={bin.voltage !== undefined ? `${bin.voltage} V` : "-"}
        />
      </div>

      {/* Actions */}
      {isAdmin && (
        <div className="mt-6 flex gap-3 border-t border-white/10 pt-5">
          <button
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#050A44] px-4 py-2 text-sm hover:bg-[#0A21C0]"
          >
            <Pencil className="h-4 w-4" />
            แก้ไข
          </button>

          <button
            onClick={onDelete}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
          >
            <Trash2 className="h-4 w-4" />
            ลบ
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================
   Info Row
========================= */

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {icon}
        <span>{label}</span>
      </div>

      <span className="max-w-[60%] truncate text-right text-sm">{value}</span>
    </div>
  );
}