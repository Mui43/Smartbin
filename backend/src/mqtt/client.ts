import mqtt from "mqtt";

import { Telemetry } from "../models/telemetry.js";
import { WasteEvent } from "../models/wasteEvent.js";
import { Device } from "../models/device.js";

import { broadcastRealtime } from "../routes/realtime.js";

import { notifyBinAlerts } from "../alerts/notifyAlerts.js";

let mqttClient: mqtt.MqttClient | null = null;

let offlineChecker: NodeJS.Timeout | null = null;

const MQTT_BROKER_URL =
  process.env.MQTT_BROKER_URL ||
  "mqtt://localhost:1883";

type DeviceStatus =
  | "online"
  | "offline"
  | "warning";

/**
 * Update device statuses from MQTT telemetry
 */
async function updateDeviceStatuses(
  binId: string,
  devices: unknown
) {
  if (
    !devices ||
    typeof devices !== "object" ||
    Array.isArray(devices)
  ) {
    return;
  }

  const deviceStatuses =
    devices as Record<string, unknown>;

  for (const [
    deviceId,
    rawStatus,
  ] of Object.entries(deviceStatuses)) {
    const status =
      typeof rawStatus === "string"
        ? rawStatus
        : "";

    if (
      status !== "online" &&
      status !== "offline" &&
      status !== "warning"
    ) {
      console.warn(
        `⚠️ Invalid device status: ${deviceId} → ${status}`
      );

      continue;
    }

    const update: {
      status: DeviceStatus;
      lastSeen?: Date;
    } = {
      status,
    };

    /**
     * lastSeen means the last time
     * the device reported itself online.
     */
    if (status === "online") {
      update.lastSeen = new Date();
    }

    const device =
      await Device.findOneAndUpdate(
        {
          deviceId,
          binId,
        },
        {
          $set: update,
        },
        {
          new: true,
        }
      );

    if (!device) {
      console.warn(
        `⚠️ Device not found: ${deviceId} in ${binId}`
      );

      continue;
    }

    console.log(
      `🔌 Device status: ${deviceId} → ${status}`
    );

    /**
     * Send device status to frontend
     * through Server-Sent Events.
     */
    broadcastRealtime(
      {
        type: "device",
        binId: device.binId,
        deviceId: device.deviceId,
        name: device.name,
        status: device.status,
        lastSeen:
          device.lastSeen ?? null,
      },
      "device"
    );
  }
}

/**
 * Start automatic offline checker.
 *
 * A device becomes offline when:
 * - current status = online
 * - lastSeen is older than 60 seconds
 *
 * Checker runs every 30 seconds.
 */
function startOfflineChecker() {
  if (offlineChecker) {
    return;
  }

  offlineChecker = setInterval(
    async () => {
      try {
        const timeout = new Date(
          Date.now() - 60 * 1000
        );

        const devices =
          await Device.find({
            status: "online",
            lastSeen: {
              $lt: timeout,
            },
          });

        for (const device of devices) {
          device.status = "offline";

          await device.save();

          console.log(
            `🔴 Device offline: ${device.deviceId}`
          );

          broadcastRealtime(
            {
              type: "device",
              binId: device.binId,
              deviceId: device.deviceId,
              name: device.name,
              status: "offline",
              lastSeen:
                device.lastSeen ?? null,
            },
            "device"
          );
        }
      } catch (error) {
        console.error(
          "❌ Device offline checker error:",
          error
        );
      }
    },
    30 * 1000
  );
}

export function startMqtt() {
  /**
   * Prevent creating multiple MQTT clients
   * if startMqtt() is accidentally called twice.
   */
  if (mqttClient) {
    return mqttClient;
  }

  const client =
    mqtt.connect(MQTT_BROKER_URL);

  mqttClient = client;

  startOfflineChecker();

  // ==============================
  // MQTT Connected
  // ==============================

  client.on("connect", () => {
    console.log(
      "✅ MQTT connected"
    );

    client.subscribe(
      [
        "bins/+/telemetry",
        "bins/+/event/waste",
      ],
      (error) => {
        if (error) {
          console.error(
            "❌ MQTT subscribe error:",
            error
          );

          return;
        }

        console.log(
          "📡 Subscribed: bins/+/telemetry"
        );

        console.log(
          "📡 Subscribed: bins/+/event/waste"
        );
      }
    );
  });

  // ==============================
  // MQTT Message
  // ==============================

  client.on(
    "message",
    async (topic, message) => {
      try {
        console.log(
          "📨 MQTT:",
          topic
        );

        const parts =
          topic.split("/");

        /**
         * Expected:
         *
         * bins/A-001/telemetry
         * bins/A-001/event/waste
         */

        if (
          parts.length < 3 ||
          parts[0] !== "bins"
        ) {
          console.warn(
            `⚠️ Invalid MQTT topic: ${topic}`
          );

          return;
        }

        const binId =
          parts[1];

        const raw =
          message.toString();

        console.log(
          "📦 RAW MQTT:",
          raw
        );

        // ==========================
        // Waste Event
        // ==========================

        if (
          parts[2] === "event" &&
          parts[3] === "waste"
        ) {
          await WasteEvent.create({
            binId,
            sensor: "ir",
            timestamp: new Date(),
          });

          console.log(
            `🗑️ Waste detected: ${binId}`
          );

          broadcastRealtime(
            {
              type: "waste",
              binId,
              timestamp:
                new Date(),
            },
            "waste"
          );

          return;
        }

        // ==========================
        // Telemetry
        // ==========================

        if (
          parts[2] !== "telemetry"
        ) {
          return;
        }

        let data: any;

        try {
          data = JSON.parse(raw);
        } catch (error) {
          console.error(
            "❌ Invalid MQTT JSON:",
            raw
          );

          return;
        }

        // ==========================
        // Save Telemetry
        // ==========================

        const telemetry =
          await Telemetry.create({
            binId,

            level:
              typeof data.level ===
              "number"
                ? data.level
                : 0,

            sensorStatus:
              data.sensorStatus ??
              "unknown",

            voltage:
              typeof data.voltage ===
              "number"
                ? data.voltage
                : 0,

            batteryPct:
              typeof data.batteryPct ===
              "number"
                ? data.batteryPct
                : 0,

            timestamp:
              data.timestamp
                ? new Date(
                    data.timestamp
                  )
                : new Date(),
          });

        console.log(
          `💾 Telemetry saved: ${telemetry.binId}`
        );

        // ==========================
        // Update Devices
        // ==========================

        await updateDeviceStatuses(
          binId,
          data.devices
        );

        // ==========================
        // Alert
        // ==========================

        await notifyBinAlerts(
          telemetry.binId
        );

        // ==========================
        // Realtime Telemetry
        // ==========================

        broadcastRealtime(
          {
            type: "telemetry",

            binId:
              telemetry.binId,

            level:
              telemetry.level,

            sensorStatus:
              telemetry.sensorStatus,

            voltage:
              telemetry.voltage,

            batteryPct:
              telemetry.batteryPct,

            timestamp:
              telemetry.timestamp,
          },
          "telemetry"
        );
      } catch (error) {
        console.error(
          "❌ MQTT message processing error:",
          error
        );
      }
    }
  );

  // ==============================
  // MQTT Error
  // ==============================

  client.on(
    "error",
    (error) => {
      console.error(
        "❌ MQTT error:",
        error
      );
    }
  );

  // ==============================
  // MQTT Close
  // ==============================

  client.on(
    "close",
    () => {
      console.log(
        "⚠️ MQTT connection closed"
      );
    }
  );

  // ==============================
  // MQTT Reconnect
  // ==============================

  client.on(
    "reconnect",
    () => {
      console.log(
        "🔄 MQTT reconnecting..."
      );
    }
  );

  return client;
}

// ==================================
// Lock / Unlock
// ==================================

export function publishLockCommand(
  binId: string,
  action:
    | "lock"
    | "unlock"
) {
  if (!mqttClient) {
    throw new Error(
      "MQTT client is not connected"
    );
  }

  if (!mqttClient.connected) {
    throw new Error(
      "MQTT broker is not connected"
    );
  }

  const topic =
    `bins/${binId}/command/lock`;

  const payload =
    JSON.stringify({
      action,
      timestamp:
        new Date().toISOString(),
    });

  mqttClient.publish(
    topic,
    payload,
    (error) => {
      if (error) {
        console.error(
          "❌ MQTT lock command error:",
          error
        );

        return;
      }

      console.log(
        `🔐 Lock command sent: ${topic} → ${action}`
      );
    }
  );
}