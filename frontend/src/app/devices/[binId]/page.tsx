"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Swal from "sweetalert2";

import {
  ArrowLeft,
  Cpu,
  Wifi,
  WifiOff,
  AlertTriangle,
  MapPin,
  Loader2,
  Server,
  Radio,
  Gauge,
  Lock,
  Volume2,
  Zap,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronRight,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";

interface Bin {
  binId: string;
  name: string;
  location: string;
}

type DeviceStatus = "online" | "offline" | "warning";

interface Device {
  _id?: string;
  deviceId: string;
  binId: string;
  name: string;
  type: string;
  description?: string;
  status: DeviceStatus;
  lastSeen?: string;
}

interface DeviceResponse {
  success: boolean;
  bin: Bin;
  devices: Device[];
}

interface DeviceForm {
  deviceId: string;
  name: string;
  type: string;
  description: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const DEVICE_TYPES = [
  { value: "ESP32", label: "ESP32" },
  { value: "IR_SENSOR", label: "IR Sensor" },
  { value: "PROXIMITY_SENSOR", label: "Proximity Sensor" },
  { value: "ULTRASONIC_SENSOR", label: "Ultrasonic Sensor" },
  { value: "SERVO_MOTOR", label: "Servo Motor" },
  { value: "BUZZER", label: "Buzzer" },
  { value: "DOOR_LOCK", label: "Door Lock" },
  { value: "OTHER", label: "Other" },
];

const emptyForm: DeviceForm = {
  deviceId: "",
  name: "",
  type: "ESP32",
  description: "",
};

export default function BinDevicesPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();

  const [bin, setBin] = useState<Bin | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] =
    useState<Device | null>(null);

  const [form, setForm] =
    useState<DeviceForm>(emptyForm);

  const [saving, setSaving] = useState(false);

  const accessToken = session?.user?.accessToken;
  const role = session?.user?.role;
  const isAdmin = role === "admin";

  const binId = Array.isArray(params.binId)
    ? params.binId[0]
    : String(params.binId);

  // =========================================================
  // Load Devices
  // =========================================================

  const loadDevices = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken || !binId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/device/bin/${encodeURIComponent(binId)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
            signal,
          },
        );

        const result =
          (await response.json()) as DeviceResponse;

        if (!response.ok) {
          throw new Error(
            "ไม่สามารถโหลด Device ของ Bin นี้ได้",
          );
        }

        setBin(result.bin);
        setDevices(result.devices || []);
      } catch (err: unknown) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.error("Load bin devices error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "ไม่สามารถเชื่อมต่อ Backend ได้",
        );
      } finally {
        setLoading(false);
      }
    },
    [accessToken, binId],
  );

  useEffect(() => {
    const controller = new AbortController();

    if (status === "authenticated") {
      loadDevices(controller.signal);
    }

    return () => {
      controller.abort();
    };
  }, [status, loadDevices]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const eventSource = new EventSource(`${API_URL}/api/realtime`);
    let connectedOnce = false;

    eventSource.addEventListener("connected", () => {
      if (connectedOnce) loadDevices();
      connectedOnce = true;
    });

    eventSource.addEventListener("device", (event) => {
      try {
        const update = JSON.parse(event.data);
        if (update.binId !== binId) return;
        setDevices((current) => current.map((device) =>
          device.deviceId === update.deviceId
            ? { ...device, status: update.status, lastSeen: update.lastSeen }
            : device,
        ));
      } catch (error) {
        console.error("Device event parse error:", error);
      }
    });

    return () => eventSource.close();
  }, [status, binId, loadDevices]);

  // =========================================================
  // Summary
  // =========================================================

  const onlineCount = devices.filter(
    (device) => device.status === "online",
  ).length;

  const offlineCount = devices.filter(
    (device) => device.status === "offline",
  ).length;

  const warningCount = devices.filter(
    (device) => device.status === "warning",
  ).length;

  // =========================================================
  // Modal
  // =========================================================

  function openAddModal() {
    setEditingDevice(null);

    setForm({
      ...emptyForm,
    });

    setShowModal(true);
  }

  function openEditModal(device: Device) {
    setEditingDevice(device);

    setForm({
      deviceId: device.deviceId,
      name: device.name,
      type: device.type,
      description: device.description || "",
    });

    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingDevice(null);
    setForm({
      ...emptyForm,
    });
  }

  // =========================================================
  // Add / Edit Device
  // =========================================================

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (!accessToken) return;

    if (!form.deviceId.trim() || !form.name.trim()) {
      await Swal.fire({
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอก Device ID และชื่ออุปกรณ์",
        icon: "warning",
        background: "#131822",
        color: "#fff",
        confirmButtonColor: "#10b981",
      });

      return;
    }

    try {
      setSaving(true);

      const isEditing = Boolean(editingDevice);

      const url = isEditing
        ? `${API_URL}/api/device/${encodeURIComponent(
          editingDevice!.deviceId,
        )}`
        : `${API_URL}/api/device`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },

        body: JSON.stringify({
          deviceId: form.deviceId.trim(),
          binId,
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
          "ไม่สามารถบันทึก Device ได้"
        );
      }

      setShowModal(false);
      setEditingDevice(null);
      setForm({
        ...emptyForm,
      });

      await loadDevices();

      await Swal.fire({
        title: isEditing
          ? "แก้ไขสำเร็จ"
          : "เพิ่ม Device สำเร็จ",

        text: isEditing
          ? "ข้อมูล Hardware ถูกแก้ไขแล้ว"
          : "เพิ่ม Hardware Device แล้ว",

        icon: "success",
        background: "#131822",
        color: "#fff",
        confirmButtonColor: "#10b981",
      });
    } catch (err: unknown) {
      console.error("Save device error:", err);

      await Swal.fire({
        title: "เกิดข้อผิดพลาด",

        text:
          err instanceof Error
            ? err.message
            : "ไม่สามารถบันทึก Device ได้",

        icon: "error",
        background: "#131822",
        color: "#fff",
        confirmButtonColor: "#10b981",
      });
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // Delete Device
  // =========================================================

  async function handleDelete(device: Device) {
    if (!accessToken) return;

    const result = await Swal.fire({
      title: "ลบ Device นี้?",

      html: `
        <div style="color:#94a3b8">
          คุณกำลังจะลบ
          <strong style="color:white">
            ${device.name}
          </strong>
          <br />
          <span style="font-family:monospace">
            ${device.deviceId}
          </span>
        </div>
      `,

      icon: "warning",

      background: "#131822",
      color: "#fff",

      showCancelButton: true,

      confirmButtonText: "ลบ Device",
      cancelButtonText: "ยกเลิก",

      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#334155",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/api/device/${encodeURIComponent(
          device.deviceId,
        )}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
          data?.message ||
          "ไม่สามารถลบ Device ได้",
        );
      }

      setDevices((current) =>
        current.filter(
          (item) => item.deviceId !== device.deviceId,
        ),
      );

      await Swal.fire({
        title: "ลบสำเร็จ",
        text: "ลบ Hardware Device แล้ว",
        icon: "success",
        background: "#131822",
        color: "#fff",
        confirmButtonColor: "#10b981",
      });
    } catch (err: unknown) {
      console.error("Delete device error:", err);

      await Swal.fire({
        title: "เกิดข้อผิดพลาด",

        text:
          err instanceof Error
            ? err.message
            : "ไม่สามารถลบ Device ได้",

        icon: "error",
        background: "#131822",
        color: "#fff",
        confirmButtonColor: "#10b981",
      });
    }
  }

  // =========================================================
  // Auth Loading
  // =========================================================

  if (status === "loading") {
    return <PageLoading />;
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0d14] text-white">
        กรุณาเข้าสู่ระบบ
      </main>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-[#0a0d14] text-white">
      <Sidebar />

      <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8">

        {/* Back */}

        <button
          type="button"
          onClick={() => router.push("/devices")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Devices
        </button>

        {/* Header */}

        <div className="mt-6">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-8 w-48 rounded bg-[#212b3d]" />

              <div className="mt-3 h-4 w-32 rounded bg-[#212b3d]" />
            </div>
          ) : bin ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-500">
                  Smart Bin Hardware
                </p>

                <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  {bin.name}
                </h1>

                <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                  <MapPin className="h-4 w-4" />
                  {bin.location}
                </div>

                <p className="mt-1 font-mono text-xs text-slate-500">
                  {bin.binId}
                </p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  <Plus className="h-4 w-4" />
                  Add Device
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* Error */}

        {error && (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Summary */}

        {!loading && !error && (
          <div className="mt-6 grid gap-4 sm:grid-cols-4">

            <SummaryCard
              label="Total Devices"
              value={devices.length}
              icon={
                <Cpu className="h-5 w-5 text-slate-400" />
              }
            />

            <SummaryCard
              label="Online"
              value={onlineCount}
              icon={
                <Wifi className="h-5 w-5 text-emerald-400" />
              }
            />

            <SummaryCard
              label="Offline"
              value={offlineCount}
              icon={
                <WifiOff className="h-5 w-5 text-rose-400" />
              }
            />

            <SummaryCard
              label="Warning"
              value={warningCount}
              icon={
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              }
            />

          </div>
        )}

        {/* Devices */}

        <div className="mt-8">

          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">
              Hardware Devices
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              อุปกรณ์ Hardware ที่ติดตั้งอยู่ภายใน{" "}
              {bin?.name}
            </p>
          </div>

          {loading ? (
            <DeviceLoadingCards />
          ) : devices.length === 0 ? (
            <EmptyDevices
              isAdmin={isAdmin}
              onAdd={openAddModal}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              {devices.map((device) => (
                <DeviceCard
                  key={device._id || device.deviceId}
                  device={device}
                  isAdmin={isAdmin}
                  onEdit={() => openEditModal(device)}
                  onDelete={() => handleDelete(device)}
                  onDetail={() =>
                    router.push(
                      `/devices/${encodeURIComponent(
                        binId,
                      )}/${encodeURIComponent(
                        device.deviceId,
                      )}`,
                    )
                  }
                />
              ))}

            </div>
          )}

        </div>
      </div>

      {/* Modal */}

      {showModal && (
        <DeviceModal
          editingDevice={editingDevice}
          form={form}
          setForm={setForm}
          saving={saving}
          binId={binId}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  );
}

// =========================================================
// Device Card
// =========================================================

function DeviceCard({
  device,
  isAdmin,
  onEdit,
  onDelete,
  onDetail,
}: {
  device: Device;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDetail: () => void;
}) {
  const icon = getDeviceIcon(device.type);

  return (
    <article className="rounded-xl border border-[#212b3d] bg-[#131822] p-5 shadow-lg transition hover:border-slate-700">

      <div className="flex items-start justify-between gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#212b3d] bg-[#0a0d14]">
          {icon}
        </div>

        <StatusBadge status={device.status} />

      </div>

      <div className="mt-5">
        <h3 className="font-bold text-white">
          {device.name}
        </h3>

        <p className="mt-1 font-mono text-xs text-slate-500">
          {device.deviceId}
        </p>
      </div>

      {device.description && (
        <p className="mt-4 min-h-[40px] text-sm leading-5 text-slate-400">
          {device.description}
        </p>
      )}

      <div className="mt-5 border-t border-[#212b3d] pt-4">

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Type
          </span>

          <span className="font-medium text-slate-300">
            {formatDeviceType(device.type)}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Last seen
          </span>

          <span className="font-medium text-slate-300">
            {device.lastSeen
              ? formatDate(device.lastSeen)
              : "--"}
          </span>
        </div>

      </div>

      {/* Detail */}

      <button
        type="button"
        onClick={onDetail}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#334155] bg-[#0f141d] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-[#1b2432] hover:text-white"
      >
        View Details
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      {/* Admin */}

      {isAdmin && (
        <div className="mt-2 grid grid-cols-2 gap-2">

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#334155] bg-[#0f141d] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-[#1b2432] hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>

        </div>
      )}

    </article>
  );
}

// =========================================================
// Device Modal
// =========================================================

function DeviceModal({
  editingDevice,
  form,
  setForm,
  saving,
  binId,
  onClose,
  onSubmit,
}: {
  editingDevice: Device | null;
  form: DeviceForm;
  setForm: React.Dispatch<React.SetStateAction<DeviceForm>>;
  saving: boolean;
  binId: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

      <div className="w-full max-w-lg rounded-2xl border border-[#293548] bg-[#131822] shadow-2xl">

        {/* Header */}

        <div className="flex items-center justify-between border-b border-[#212b3d] px-6 py-4">

          <div>
            <h2 className="text-lg font-bold text-white">
              {editingDevice
                ? "Edit Device"
                : "Add Device"}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {editingDevice
                ? "แก้ไขข้อมูล Hardware Device"
                : "เพิ่ม Hardware Device ให้กับ Smart Bin"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-[#212b3d] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* Form */}

        <form
          onSubmit={onSubmit}
          className="space-y-5 p-6"
        >

          {/* Bin */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Smart Bin
            </label>

            <input
              value={binId}
              disabled
              className="w-full rounded-lg border border-[#293548] bg-[#0a0d14] px-3 py-2.5 font-mono text-sm text-slate-500 outline-none"
            />
          </div>

          {/* Device ID */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Device ID
            </label>

            <input
              value={form.deviceId}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  deviceId: e.target.value,
                }))
              }
              disabled={Boolean(editingDevice)}
              placeholder="เช่น ESP32-A001"
              className="w-full rounded-lg border border-[#293548] bg-[#0a0d14] px-3 py-2.5 font-mono text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 disabled:cursor-not-allowed disabled:text-slate-500"
            />

            {editingDevice && (
              <p className="mt-1 text-xs text-slate-600">
                Device ID ไม่สามารถแก้ไขได้
              </p>
            )}
          </div>

          {/* Name */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Device Name
            </label>

            <input
              value={form.name}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  name: e.target.value,
                }))
              }
              placeholder="เช่น ESP32 Controller"
              className="w-full rounded-lg border border-[#293548] bg-[#0a0d14] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>

          {/* Type */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Device Type
            </label>

            <select
              value={form.type}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  type: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#293548] bg-[#0a0d14] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
            >
              {DEVICE_TYPES.map((deviceType) => (
                <option
                  key={deviceType.value}
                  value={deviceType.value}
                >
                  {deviceType.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Description
            </label>

            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
              rows={3}
              placeholder="รายละเอียดของอุปกรณ์..."
              className="w-full resize-none rounded-lg border border-[#293548] bg-[#0a0d14] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>

          {/* Buttons */}

          <div className="flex justify-end gap-3 border-t border-[#212b3d] pt-5">

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-[#334155] bg-[#0f141d] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-[#1b2432] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {saving
                ? "Saving..."
                : editingDevice
                  ? "Save Changes"
                  : "Add Device"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}

// =========================================================
// Device Icon
// =========================================================

function getDeviceIcon(type: string) {
  const className = "h-5 w-5 text-emerald-400";

  switch (type) {
    case "ESP32":
      return <Cpu className={className} />;

    case "IR_SENSOR":
      return <Radio className={className} />;

    case "PROXIMITY_SENSOR":
      return <Radio className={className} />;

    case "ULTRASONIC_SENSOR":
      return <Gauge className={className} />;

    case "SERVO_MOTOR":
      return <Zap className={className} />;

    case "BUZZER":
      return <Volume2 className={className} />;

    case "DOOR_LOCK":
      return <Lock className={className} />;

    default:
      return <Server className={className} />;
  }
}

// =========================================================
// Status
// =========================================================

function StatusBadge({
  status,
}: {
  status: DeviceStatus;
}) {
  const config: Record<
    DeviceStatus,
    {
      label: string;
      className: string;
      dot: string;
    }
  > = {
    online: {
      label: "Online",
      className:
        "border-emerald-900 bg-emerald-950/60 text-emerald-400",
      dot: "bg-emerald-400",
    },

    offline: {
      label: "Offline",
      className:
        "border-rose-900 bg-rose-950/60 text-rose-400",
      dot: "bg-rose-400",
    },

    warning: {
      label: "Warning",
      className:
        "border-amber-900 bg-amber-950/60 text-amber-400",
      dot: "bg-amber-400",
    },
  };

  const current = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${current.className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${current.dot}`}
      />

      {current.label}
    </span>
  );
}

// =========================================================
// Summary Card
// =========================================================

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
          <p className="text-sm text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#212b3d] bg-[#0a0d14]">
          {icon}
        </div>

      </div>

    </div>
  );
}

// =========================================================
// Loading
// =========================================================

function DeviceLoadingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

      {[1, 2, 3, 4, 5, 6, 7].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-xl border border-[#212b3d] bg-[#131822] p-5"
        >
          <div className="flex justify-between">
            <div className="h-11 w-11 rounded-xl bg-[#212b3d]" />

            <div className="h-6 w-16 rounded-full bg-[#212b3d]" />
          </div>

          <div className="mt-5 h-5 w-28 rounded bg-[#212b3d]" />

          <div className="mt-2 h-3 w-24 rounded bg-[#212b3d]" />

          <div className="mt-5 h-10 rounded bg-[#212b3d]" />

          <div className="mt-5 border-t border-[#212b3d] pt-4">

            <div className="h-3 w-full rounded bg-[#212b3d]" />

            <div className="mt-3 h-3 w-full rounded bg-[#212b3d]" />

          </div>
        </div>
      ))}

    </div>
  );
}

// =========================================================
// Empty
// =========================================================

function EmptyDevices({
  isAdmin,
  onAdd,
}: {
  isAdmin: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#212b3d] bg-[#131822] p-10 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#212b3d] bg-[#0a0d14]">
        <Cpu className="h-8 w-8 text-slate-500" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-white">
        ยังไม่มี Hardware Device
      </h3>

      <p className="mt-2 text-sm text-slate-400">
        ยังไม่มีอุปกรณ์ที่เชื่อมกับ Smart Bin นี้
      </p>

      {isAdmin && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Add Device
        </button>
      )}

    </div>
  );
}

// =========================================================
// Helpers
// =========================================================

function formatDeviceType(type: string) {
  const names: Record<string, string> = {
    ESP32: "ESP32",
    IR_SENSOR: "IR Sensor",
    PROXIMITY_SENSOR: "Proximity Sensor",
    ULTRASONIC_SENSOR: "Ultrasonic Sensor",
    SERVO_MOTOR: "Servo Motor",
    BUZZER: "Buzzer",
    DOOR_LOCK: "Door Lock",
    OTHER: "Other",
  };

  return names[type] || type;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =========================================================
// Page Loading
// =========================================================

function PageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0d14] text-white">

      <div className="text-center text-slate-400">

        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />

        <p className="mt-3 text-sm">
          Loading Devices...
        </p>

      </div>

    </main>
  );
}
