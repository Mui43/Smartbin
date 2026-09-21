"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

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
  const [editingBin, setEditingBin] =
    useState<Bin | null>(null);

  const [form, setForm] =
    useState<BinForm>(emptyForm);

  const role = session?.user?.role;

  const canManage = role === "admin";

  async function loadBins() {
    if (!session?.user?.accessToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/bins`,
        {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result?.error?.message ||
          "ไม่สามารถโหลดข้อมูล Bin ได้"
        );
        return;
      }

      if (result.success) {
        setBins(result.data || []);
      }
    } catch (error) {
      console.error("Load bins error:", error);
      setError("ไม่สามารถเชื่อมต่อ Backend ได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadBins();
    }
  }, [status, session]);

  const filteredBins = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return bins;
    }

    return bins.filter((bin) =>
      [
        bin.binId,
        bin.name,
        bin.location,
        bin.mqttTopic,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
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

  function updateForm(
    field: keyof BinForm,
    value: string | number
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!session?.user?.accessToken) {
      return;
    }

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
          Authorization: `Bearer ${session.user.accessToken}`,
        },

        body: JSON.stringify({
          binId: form.binId.trim(),
          name: form.name.trim(),
          location: form.location.trim(),
          mqttTopic: form.mqttTopic.trim(),
          thresholdPct: Number(
            form.thresholdPct
          ),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result?.error?.message ||
          "ไม่สามารถบันทึกข้อมูลได้"
        );
        return;
      }

      setModalOpen(false);
      setEditingBin(null);
      setForm(emptyForm);

      await loadBins();
    } catch (error) {
      console.error(
        "Save bin error:",
        error
      );

      setError(
        "ไม่สามารถเชื่อมต่อ Backend ได้"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(bin: Bin) {
    if (!session?.user?.accessToken) {
      return;
    }

    const confirmed = window.confirm(
      `ต้องการลบ ${bin.name} (${bin.binId}) หรือไม่?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/api/bins/${bin.binId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result?.error?.message ||
          "ไม่สามารถลบ Bin ได้"
        );
        return;
      }

      await loadBins();
    } catch (error) {
      console.error(
        "Delete bin error:",
        error
      );

      setError(
        "ไม่สามารถเชื่อมต่อ Backend ได้"
      );
    }
  }

  if (status === "loading") {
    return <PageLoading />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#202A30] p-6 text-[#EBF4DD]">
        กรุณาเข้าสู่ระบบ
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#202A30] text-[#EBF4DD]">
      <Sidebar />

      <div className="p-4 sm:p-6 lg:ml-64 lg:p-8">
        {/* Header */}

        <div
          className="
            flex
            flex-col
            gap-4
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#90AB8B]">
              Management
            </p>

            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Devices
            </h1>

            <p className="mt-2 text-sm text-[#90AB8B]">
              จัดการ Smart Bin และตรวจสอบสถานะอุปกรณ์
            </p>
          </div>

          {canManage && (
            <button
              onClick={openAddModal}
              className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#5A7863]
                px-5
                py-3
                font-semibold
                text-[#EBF4DD]
                shadow-lg
                transition
                hover:bg-[#90AB8B]
                hover:text-[#202A30]
                active:scale-[0.98]
                sm:w-auto
              "
            >
              <span className="text-lg">
                +
              </span>

              Add Device
            </button>
          )}
        </div>

        {/* Summary */}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Devices"
            value={bins.length}
            icon="🗑️"
          />

          <SummaryCard
            label="Online"
            value={
              bins.filter((bin) =>
                isOnline(bin)
              ).length
            }
            icon="●"
          />

          <SummaryCard
            label="Offline"
            value={
              bins.filter(
                (bin) => !isOnline(bin)
              ).length
            }
            icon="○"
          />
        </div>

        {/* Search */}

        <div className="mt-6 rounded-2xl border border-[#5A7863]/30 bg-[#3B4953] p-4 shadow-xl">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#90AB8B]">
              🔍
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="ค้นหา Bin ID, ชื่อ, สถานที่ หรือ MQTT Topic..."
              className="
                w-full
                rounded-xl
                border
                border-[#5A7863]/40
                bg-[#202A30]
                py-3
                pl-11
                pr-4
                text-[#EBF4DD]
                outline-none
                transition
                placeholder:text-[#90AB8B]/60
                focus:border-[#90AB8B]
                focus:ring-2
                focus:ring-[#90AB8B]/20
              "
            />
          </div>
        </div>

        {/* Error */}

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Devices */}

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
                  key={
                    bin._id ||
                    bin.id ||
                    bin.binId
                  }
                  bin={bin}
                  canManage={canManage}
                  onEdit={() =>
                    openEditModal(bin)
                  }
                  onDelete={() =>
                    handleDelete(bin)
                  }
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

  const level = Math.min(
    Math.max(bin.level ?? 0, 0),
    100
  );

  const battery = Math.min(
    Math.max(bin.batteryPct ?? 0, 0),
    100
  );

  return (
    <article
      className="
        overflow-hidden
        rounded-2xl
        border
        border-[#5A7863]/30
        bg-[#3B4953]
        shadow-xl
        transition
        duration-200
        hover:-translate-y-0.5
        hover:border-[#90AB8B]/40
      "
    >
      {/* Card Header */}

      <div className="border-b border-[#5A7863]/25 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-[#EBF4DD]">
              {bin.name}
            </p>

            <p className="mt-1 font-mono text-xs text-[#90AB8B]">
              {bin.binId}
            </p>
          </div>

          <StatusBadge online={online} />
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-[#90AB8B]">
          <span>📍</span>

          <span className="truncate">
            {bin.location}
          </span>
        </div>
      </div>

      {/* Stats */}

      <div className="grid grid-cols-3 gap-px bg-[#5A7863]/20">
        <DeviceStat
          label="Level"
          value={`${level}%`}
        />

        <DeviceStat
          label="Battery"
          value={`${battery}%`}
        />

        <DeviceStat
          label="Voltage"
          value={
            bin.voltage !== undefined
              ? `${bin.voltage.toFixed(1)}V`
              : "--"
          }
        />
      </div>

      {/* Level */}

      <div className="p-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#90AB8B]">
            Waste Level
          </span>

          <span className="font-medium text-[#EBF4DD]">
            {level}%
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#202A30]">
          <div
            className={`
              h-full
              rounded-full
              transition-all
              ${level >= 90
                ? "bg-red-400"
                : level >= 75
                  ? "bg-yellow-300"
                  : "bg-[#90AB8B]"
              }
            `}
            style={{
              width: `${level}%`,
            }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#90AB8B]">
              Threshold
            </p>

            <p className="mt-1 text-sm font-semibold text-[#EBF4DD]">
              {bin.thresholdPct}%
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-[#90AB8B]">
              Last Seen
            </p>

            <p className="mt-1 text-xs text-[#EBF4DD]">
              {bin.lastSeen
                ? formatDate(bin.lastSeen)
                : "--"}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}

      {canManage && (
        <div className="grid grid-cols-2 gap-3 border-t border-[#5A7863]/25 p-4">
          <button
            onClick={onEdit}
            className="
              rounded-xl
              border
              border-[#5A7863]/50
              bg-[#202A30]
              px-4
              py-2.5
              text-sm
              font-medium
              text-[#EBF4DD]
              transition
              hover:bg-[#5A7863]
            "
          >
            Edit
          </button>

          <button
            onClick={onDelete}
            className="
              rounded-xl
              border
              border-red-400/20
              bg-red-400/5
              px-4
              py-2.5
              text-sm
              font-medium
              text-red-300
              transition
              hover:bg-red-400/10
            "
          >
            Delete
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
  onSubmit: (
    event: React.FormEvent
  ) => void;
  onChange: (
    field: keyof BinForm,
    value: string | number
  ) => void;
}) {
  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        bg-black/70
        p-4
        backdrop-blur-sm
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="
          max-h-[90vh]
          w-full
          max-w-lg
          overflow-y-auto
          rounded-2xl
          border
          border-[#5A7863]/40
          bg-[#3B4953]
          shadow-2xl
        "
      >
        {/* Modal Header */}

        <div className="flex items-center justify-between border-b border-[#5A7863]/30 p-5 sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#90AB8B]">
              Device Management
            </p>

            <h2 className="mt-1 text-xl font-bold text-[#EBF4DD]">
              {editing
                ? "Edit Device"
                : "Add Device"}
            </h2>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              text-[#90AB8B]
              transition
              hover:bg-[#202A30]
              hover:text-[#EBF4DD]
            "
          >
            ✕
          </button>
        </div>

        {/* Form */}

        <form
          onSubmit={onSubmit}
          className="space-y-4 p-5 sm:p-6"
        >
          <FormField
            label="Bin ID"
            value={form.binId}
            placeholder="A-001"
            disabled={editing}
            onChange={(value) =>
              onChange("binId", value)
            }
          />

          <FormField
            label="Name"
            value={form.name}
            placeholder="Bin A-001"
            onChange={(value) =>
              onChange("name", value)
            }
          />

          <FormField
            label="Location"
            value={form.location}
            placeholder="Building A"
            onChange={(value) =>
              onChange(
                "location",
                value
              )
            }
          />

          <FormField
            label="MQTT Topic"
            value={form.mqttTopic}
            placeholder="bins/A-001"
            onChange={(value) =>
              onChange(
                "mqttTopic",
                value
              )
            }
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-[#EBF4DD]">
              Full Threshold
            </label>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={form.thresholdPct}
                onChange={(event) =>
                  onChange(
                    "thresholdPct",
                    Number(
                      event.target.value
                    )
                  )
                }
                className="w-full accent-[#90AB8B]"
              />

              <span className="w-14 rounded-lg bg-[#202A30] px-2 py-2 text-center text-sm font-semibold text-[#EBF4DD]">
                {form.thresholdPct}%
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Buttons */}

          <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="
                rounded-xl
                border
                border-[#5A7863]/40
                bg-[#202A30]
                px-5
                py-3
                text-sm
                font-medium
                text-[#EBF4DD]
                transition
                hover:bg-[#5A7863]
                disabled:opacity-50
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="
                rounded-xl
                bg-[#5A7863]
                px-5
                py-3
                text-sm
                font-semibold
                text-[#EBF4DD]
                transition
                hover:bg-[#90AB8B]
                hover:text-[#202A30]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {saving
                ? "Saving..."
                : editing
                  ? "Save Changes"
                  : "Add Device"}
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
      <label className="mb-2 block text-sm font-medium text-[#EBF4DD]">
        {label}
      </label>

      <input
        value={value}
        disabled={disabled}
        required
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="
          w-full
          rounded-xl
          border
          border-[#5A7863]/40
          bg-[#202A30]
          px-4
          py-3
          text-[#EBF4DD]
          outline-none
          transition
          placeholder:text-[#90AB8B]/50
          focus:border-[#90AB8B]
          focus:ring-2
          focus:ring-[#90AB8B]/20
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
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
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-[#5A7863]/30 bg-[#3B4953] p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#90AB8B]">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-[#EBF4DD]">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5A7863] text-[#EBF4DD]">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ==================================================
   Device Stat
================================================== */

function DeviceStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#202A30] p-4">
      <p className="text-xs text-[#90AB8B]">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-[#EBF4DD]">
        {value}
      </p>
    </div>
  );
}

/* ==================================================
   Status
================================================== */

function StatusBadge({
  online,
}: {
  online: boolean;
}) {
  return (
    <span
      className={`
        inline-flex
        shrink-0
        items-center
        gap-1.5
        rounded-full
        px-2.5
        py-1
        text-xs
        font-medium
        ${online
          ? "bg-[#90AB8B]/10 text-[#90AB8B]"
          : "bg-red-400/10 text-red-300"
        }
      `}
    >
      <span
        className={`
          h-1.5
          w-1.5
          rounded-full
          ${online
            ? "bg-[#90AB8B]"
            : "bg-red-300"
          }
        `}
      />

      {online ? "Online" : "Offline"}
    </span>
  );
}

/* ==================================================
   Online
================================================== */

function isOnline(bin: Bin) {
  if (!bin.lastSeen) {
    return false;
  }

  const lastSeen =
    new Date(bin.lastSeen).getTime();

  const now = Date.now();

  return now - lastSeen <= 60_000;
}

/* ==================================================
   Date
================================================== */

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleTimeString(
    "th-TH",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

/* ==================================================
   Loading
================================================== */

function LoadingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="
            h-[350px]
            animate-pulse
            rounded-2xl
            border
            border-[#5A7863]/20
            bg-[#3B4953]
          "
        />
      ))}
    </div>
  );
}

/* ==================================================
   Empty
================================================== */

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
    <div className="rounded-2xl border border-[#5A7863]/30 bg-[#3B4953] p-10 text-center shadow-xl">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5A7863] text-2xl">
        🗑️
      </div>

      <h2 className="mt-5 text-lg font-bold text-[#EBF4DD]">
        {search
          ? "ไม่พบ Device"
          : "ยังไม่มี Device"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-[#90AB8B]">
        {search
          ? "ลองเปลี่ยนคำค้นหาแล้วค้นหาอีกครั้ง"
          : "เพิ่ม Smart Bin เครื่องแรกเพื่อเริ่มต้นระบบ"}
      </p>

      {!search && canManage && (
        <button
          onClick={onAdd}
          className="mt-5 rounded-xl bg-[#5A7863] px-5 py-3 font-semibold text-[#EBF4DD] transition hover:bg-[#90AB8B] hover:text-[#202A30]"
        >
          + Add Device
        </button>
      )}
    </div>
  );
}

/* ==================================================
   Page Loading
================================================== */

function PageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#202A30] text-[#EBF4DD]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#5A7863] border-t-[#EBF4DD]" />

        <p className="mt-4 text-sm text-[#90AB8B]">
          Loading Devices...
        </p>
      </div>
    </main>
  );
}