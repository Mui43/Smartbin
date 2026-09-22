"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  Plus,
  Trash2,
  Edit,
  MapPin,
  X,
  Wifi,
  WifiOff,
  Cpu,
  Loader2,
  Command,
} from "lucide-react";
import Swal from "sweetalert2";

import Sidebar from "@/components/layout/Sidebar";

interface Bin {
  _id?: string;
  id?: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBin, setEditingBin] = useState<Bin | null>(null);

  const [form, setForm] = useState<BinForm>(emptyForm);

  const role = session?.user?.role;
  const accessToken = session?.user?.accessToken;
  const canManage = role === "admin";

  const loadBins = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/bins`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
          signal,
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result?.error?.message || "ไม่สามารถโหลดข้อมูล Bin ได้");
          return;
        }

        if (result.success) {
          setBins(result.data || []);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Load bins error:", err);
        setError("ไม่สามารถเชื่อมต่อ Backend ได้");
      } finally {
        setLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    const controller = new AbortController();

    if (status === "authenticated") {
      loadBins(controller.signal);
    }

    return () => {
      controller.abort();
    };
  }, [status, loadBins]);

  const { onlineCount, offlineCount } = useMemo(() => {
    let online = 0;
    bins.forEach((bin) => {
      if (isOnline(bin)) online++;
    });
    return {
      onlineCount: online,
      offlineCount: bins.length - online,
    };
  }, [bins]);

  const filteredBins = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return bins;

    return bins.filter((bin) =>
      [bin.binId, bin.name, bin.location, bin.mqttTopic]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [bins, search]);

  function openAddModal() {
    setEditingBin(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
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
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingBin(null);
    setForm(emptyForm);
  }

  function updateForm(field: keyof BinForm, value: string | number) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!accessToken) return;

    setSaving(true);
    setError("");

    try {
      const isEditing = Boolean(editingBin);
      const url = isEditing
        ? `${API_URL}/api/bins/${editingBin?.binId}`
        : `${API_URL}/api/bins`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
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
        const errorMsg = result?.error?.message || "ไม่สามารถบันทึกข้อมูลได้";
        setError(errorMsg);

        Swal.fire({
          title: "บันทึกไม่สำเร็จ!",
          text: errorMsg,
          icon: "error",
          background: "#131822",
          color: "#ffffff",
          confirmButtonColor: "#10b981",
          customClass: {
            popup: "rounded-2xl border border-[#212b3d] shadow-2xl",
            confirmButton: "px-5 py-2.5 rounded-xl font-semibold",
          },
        });
        return;
      }

      closeModal();
      await loadBins();

      Swal.fire({
        title: isEditing ? "แก้ไขข้อมูลสำเร็จ!" : "เพิ่มอุปกรณ์สำเร็จ!",
        text: isEditing
          ? `อัปเดตข้อมูล ${form.name} เรียบร้อยแล้ว`
          : `เพิ่ม ${form.name} เข้าสู่ระบบเรียบร้อยแล้ว`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
        background: "#131822",
        color: "#ffffff",
        customClass: {
          popup: "rounded-2xl border border-[#212b3d] shadow-2xl",
        },
      });
    } catch (err) {
      console.error("Save bin error:", err);
      const connError = "ไม่สามารถเชื่อมต่อ Backend ได้";
      setError(connError);

      Swal.fire({
        title: "เชื่อมต่อล้มเหลว!",
        text: connError,
        icon: "error",
        background: "#131822",
        color: "#ffffff",
        confirmButtonColor: "#10b981",
        customClass: {
          popup: "rounded-2xl border border-[#212b3d] shadow-2xl",
          confirmButton: "px-5 py-2.5 rounded-xl font-semibold",
        },
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(bin: Bin) {
    if (!accessToken) return;

    const result = await Swal.fire({
      title: "ยืนยันการลบอุปกรณ์?",
      text: `คุณต้องการลบ ${bin.name} (${bin.binId}) ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่, ลบเลย!",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
      background: "#131822",
      color: "#ffffff",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#212b3d",
      customClass: {
        popup: "rounded-2xl border border-[#212b3d] shadow-2xl",
        confirmButton: "px-5 py-2.5 rounded-xl font-semibold",
        cancelButton:
          "px-5 py-2.5 rounded-xl font-semibold text-slate-300 hover:text-white",
      },
    });

    if (!result.isConfirmed) return;

    try {
      setError("");

      const response = await fetch(`${API_URL}/api/bins/${bin.binId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const resResult = await response.json();

      if (!response.ok) {
        const errorMsg = resResult?.error?.message || "ไม่สามารถลบ Bin ได้";
        setError(errorMsg);

        Swal.fire({
          title: "เกิดข้อผิดพลาด!",
          text: errorMsg,
          icon: "error",
          background: "#131822",
          color: "#ffffff",
          confirmButtonColor: "#10b981",
          customClass: {
            popup: "rounded-2xl border border-[#212b3d] shadow-2xl",
            confirmButton: "px-5 py-2.5 rounded-xl font-semibold",
          },
        });
        return;
      }

      Swal.fire({
        title: "ลบสำเร็จ!",
        text: `ลบ ${bin.name} เรียบร้อยแล้ว`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
        background: "#131822",
        color: "#ffffff",
        customClass: {
          popup: "rounded-2xl border border-[#212b3d] shadow-2xl",
        },
      });

      await loadBins();
    } catch (err) {
      console.error("Delete bin error:", err);
      const connError = "ไม่สามารถเชื่อมต่อ Backend ได้";
      setError(connError);

      Swal.fire({
        title: "เชื่อมต่อล้มเหลว!",
        text: connError,
        icon: "error",
        background: "#131822",
        color: "#ffffff",
        confirmButtonColor: "#10b981",
        customClass: {
          popup: "rounded-2xl border border-[#212b3d] shadow-2xl",
          confirmButton: "px-5 py-2.5 rounded-xl font-semibold",
        },
      });
    }
  }

  if (status === "loading") {
    return <PageLoading />;
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0d14] p-6 text-white">
        กรุณาเข้าสู่ระบบ
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0d14] text-white">
      <Sidebar />

      <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-500">
              Management
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Devices
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              จัดการ Smart Bin และตรวจสอบสถานะอุปกรณ์
            </p>
          </div>

          {canManage && (
            <button
              onClick={openAddModal}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-emerald-500 active:scale-[0.98] sm:w-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Add Device</span>
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {loading ? (
            <SummarySkeleton />
          ) : (
            <>
              <SummaryCard
                label="Total Devices"
                value={bins.length}
                icon={<Cpu className="h-5 w-5 text-slate-400" />}
              />
              <SummaryCard
                label="Online"
                value={onlineCount}
                icon={<Wifi className="h-5 w-5 text-emerald-400" />}
              />
              <SummaryCard
                label="Offline"
                value={offlineCount}
                icon={<WifiOff className="h-5 w-5 text-rose-500" />}
              />
            </>
          )}
        </div>

        {/* Search Bar */}
        <DeviceSearchBar
          search={search}
          onSearchChange={setSearch}
          totalResults={filteredBins.length}
        />

        {/* Error Notification */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Device List */}
        <div className="mt-6">
          {loading ? (
            <LoadingCards />
          ) : filteredBins.length === 0 ? (
            <EmptyState
              search={search}
              canManage={canManage}
              onAdd={openAddModal}
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredBins.map((bin) => (
                <DeviceCard
                  key={bin._id || bin.id || bin.binId}
                  bin={bin}
                  canManage={canManage}
                  onEdit={() => openEditModal(bin)}
                  onDelete={() => handleDelete(bin)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <DeviceModal
          editing={Boolean(editingBin)}
          form={form}
          saving={saving}
          error={error}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onChange={updateForm}
        />
      )}
    </main>
  );
}

/* ==================================================
   Device Search Bar
================================================== */
function DeviceSearchBar({
  search,
  onSearchChange,
  totalResults,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  totalResults: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative mt-6 w-full">
      <div className="group relative flex items-center overflow-hidden rounded-xl border border-[#212b3d] bg-[#131822] p-1.5 shadow-md transition-all duration-300 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20">
        <div className="flex items-center pl-3.5 pr-2 text-slate-400 transition-colors group-focus-within:text-emerald-400">
          <Search className="h-5 w-5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ค้นหา Bin ID, ชื่ออุปกรณ์, สถานที่ หรือ MQTT Topic..."
          className="w-full bg-transparent py-2 pl-1 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-all sm:text-base"
        />

        <div className="flex items-center gap-2 pr-2">
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-[#212b3d] hover:text-white"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {search ? (
            <span className="hidden whitespace-nowrap rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 sm:inline-block">
              {totalResults} {totalResults === 1 ? "device" : "devices"}
            </span>
          ) : (
            <kbd className="hidden items-center gap-1 rounded-md border border-[#212b3d] bg-[#0a0d14] px-2 py-1 text-[10px] font-medium text-slate-400 sm:inline-flex">
              <Command className="h-3 w-3" />K
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================================================
   Device Card
================================================== */
function DeviceCard({
  bin,
  canManage,
  onEdit,
  onDelete,
}: {
  bin: Bin;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const online = isOnline(bin);
  const level = Math.min(Math.max(bin.level ?? 0, 0), 100);
  const battery = Math.min(Math.max(bin.batteryPct ?? 0, 0), 100);

  return (
    <article className="overflow-hidden rounded-xl border border-[#212b3d] bg-[#131822] shadow-lg transition duration-200 hover:border-slate-700">
      <div className="border-b border-[#212b3d] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white">{bin.name}</p>
            <p className="mt-1 font-mono text-xs text-slate-400">{bin.binId}</p>
          </div>
          <StatusBadge online={online} />
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{bin.location}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-[#212b3d]">
        <DeviceStat label="Level" value={`${level}%`} />
        <DeviceStat label="Battery" value={`${battery}%`} />
        <DeviceStat
          label="Voltage"
          value={
            bin.voltage !== undefined ? `${bin.voltage.toFixed(1)}V` : "--"
          }
        />
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Waste level</span>
          <span className="font-medium text-amber-500">{level}%</span>
        </div>

        {/* Progress Bar (เขียว -> เหลือง แบบ Gradient ตามภาพ) */}
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#0a0d14]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 transition-all duration-300"
            style={{ width: `${level}%` }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Threshold</p>
            <p className="mt-1 text-sm font-semibold text-amber-500">
              {bin.thresholdPct}%
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400">Last seen</p>
            <p className="mt-1 text-xs font-semibold text-white">
              {bin.lastSeen ? formatDate(bin.lastSeen) : "00:00"}
            </p>
          </div>
        </div>
      </div>

      {canManage && (
        <div className="grid grid-cols-2 gap-3 border-t border-[#212b3d] p-4">
          <button
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#212b3d] bg-[#0a0d14] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f283a]"
          >
            <Edit className="h-4 w-4 text-slate-400" />
            <span>Edit</span>
          </button>

          <button
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-sm font-medium text-rose-500 transition hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4 text-rose-500" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </article>
  );
}

/* ==================================================
   Device Modal
================================================== */
function DeviceModal({
  editing,
  form,
  saving,
  error,
  onClose,
  onSubmit,
  onChange,
}: {
  editing: boolean;
  form: BinForm;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onChange: (field: keyof BinForm, value: string | number) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#212b3d] bg-[#131822] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#212b3d] p-5 sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-500">
              Device Management
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              {editing ? "Edit Device" : "Add Device"}
            </h2>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-[#212b3d] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-5 sm:p-6">
          <FormField
            label="Bin ID"
            value={form.binId}
            placeholder="A-001"
            disabled={editing}
            onChange={(value) => onChange("binId", value)}
          />

          <FormField
            label="Name"
            value={form.name}
            placeholder="Bin A-001"
            onChange={(value) => onChange("name", value)}
          />

          <FormField
            label="Location"
            value={form.location}
            placeholder="Building A"
            onChange={(value) => onChange("location", value)}
          />

          <FormField
            label="MQTT Topic"
            value={form.mqttTopic}
            placeholder="bins/A-001"
            onChange={(value) => onChange("mqttTopic", value)}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Full Threshold
            </label>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={form.thresholdPct}
                onChange={(event) =>
                  onChange("thresholdPct", Number(event.target.value))
                }
                className="w-full accent-emerald-500"
              />

              <span className="w-14 rounded-lg border border-[#212b3d] bg-[#0a0d14] px-2 py-2 text-center text-sm font-semibold text-white">
                {form.thresholdPct}%
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[#212b3d] bg-[#0a0d14] px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-[#212b3d] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : editing ? (
                "Save Changes"
              ) : (
                "Add Device"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==================================================
   Form Field
================================================== */
function FormField({
  label,
  value,
  placeholder,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-white">
        {label}
      </label>

      <input
        value={value}
        disabled={disabled}
        required
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#212b3d] bg-[#0a0d14] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

/* ==================================================
   Summary Card
================================================== */
function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#212b3d] bg-[#131822] p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0a0d14] border border-[#212b3d]">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ==================================================
   Device Stat
================================================== */
function DeviceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0a0d14] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

/* ==================================================
   Status Badge
================================================== */
function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        online
          ? "border-emerald-900 bg-emerald-950/60 text-emerald-400"
          : "border-rose-900 bg-rose-950/60 text-rose-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online ? "bg-emerald-400" : "bg-rose-400"
        }`}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}

/* ==================================================
   Online Helper
================================================== */
function isOnline(bin: Bin) {
  if (!bin.lastSeen) return false;
  const lastSeen = new Date(bin.lastSeen).getTime();
  const now = Date.now();
  return now - lastSeen <= 60_000;
}

/* ==================================================
   Date Helper
================================================== */
function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "00:00";

  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ==================================================
   Loading & Skeleton Components
================================================== */
function LoadingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className="animate-pulse overflow-hidden rounded-xl border border-[#212b3d] bg-[#131822]"
        >
          <div className="border-b border-[#212b3d] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-5 w-32 rounded-md bg-[#212b3d]" />
                <div className="h-3 w-16 rounded-md bg-[#212b3d]/60" />
              </div>
              <div className="h-6 w-16 rounded-full bg-[#212b3d]" />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-[#212b3d]" />
              <div className="h-4 w-28 rounded-md bg-[#212b3d]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px bg-[#212b3d]">
            {[1, 2, 3].map((stat) => (
              <div key={stat} className="bg-[#0a0d14] p-4 space-y-2">
                <div className="h-3 w-10 rounded bg-[#212b3d]" />
                <div className="h-4 w-12 rounded bg-[#212b3d]" />
              </div>
            ))}
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-16 rounded bg-[#212b3d]" />
                <div className="h-3 w-8 rounded bg-[#212b3d]" />
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#0a0d14]" />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-1">
                <div className="h-3 w-14 rounded bg-[#212b3d]" />
                <div className="h-4 w-10 rounded bg-[#212b3d]" />
              </div>
              <div className="space-y-1 text-right">
                <div className="h-3 w-14 rounded bg-[#212b3d]" />
                <div className="h-3 w-12 rounded bg-[#212b3d]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[#212b3d] p-4">
            <div className="h-9 rounded-lg bg-[#0a0d14]" />
            <div className="h-9 rounded-lg bg-[#0a0d14]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-xl border border-[#212b3d] bg-[#131822] p-5 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-[#212b3d]" />
              <div className="h-8 w-12 rounded bg-[#212b3d]" />
            </div>
            <div className="h-10 w-10 rounded-lg bg-[#0a0d14]" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyState({
  search,
  canManage,
  onAdd,
}: {
  search: string;
  canManage: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#212b3d] bg-[#131822] p-10 text-center shadow-lg">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0a0d14] text-slate-400 border border-[#212b3d]">
        <Cpu className="h-8 w-8" />
      </div>

      <h2 className="mt-5 text-lg font-bold text-white">
        {search ? "ไม่พบ Device" : "ยังไม่มี Device"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
        {search
          ? "ลองเปลี่ยนคำค้นหาแล้วค้นหาอีกครั้ง"
          : "เพิ่ม Smart Bin เครื่องแรกเพื่อเริ่มต้นระบบ"}
      </p>

      {!search && canManage && (
        <button
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500"
        >
          <Plus className="h-5 w-5" />
          <span>Add Device</span>
        </button>
      )}
    </div>
  );
}

function PageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0d14] text-white">
      <div className="text-center text-slate-400">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
        <p className="mt-3 text-sm">Loading Devices...</p>
      </div>
    </main>
  );
}
