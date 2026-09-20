import mqtt from "mqtt";
import { Telemetry } from "../models/telemetry.js";
import { broadcastRealtime } from "../routes/realtime.js";
import { notifyBinAlerts } from "../alerts/notifyAlerts.js";

let mqttClient: mqtt.MqttClient | null = null;

const MQTT_BROKER_URL =
  process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";

export function startMqtt() {
  const client = mqtt.connect(MQTT_BROKER_URL);
  mqttClient = client;

  client.on("connect", () => {
    console.log("✅ MQTT connected");

    client.subscribe("bins/+/telemetry", (error) => {
      if (error) {
        console.error("❌ MQTT subscribe error:", error);
        return;
      }
      console.log("📡 Subscribed: bins/+/telemetry");
    });
  });

  client.on("message", async (topic, message) => {
    try {
      console.log("📨 MQTT:", topic);

      const parts = topic.split("/");
      const binId = parts[1];

      const raw = message.toString();
      console.log("📦 RAW MQTT:", raw);

      const data = JSON.parse(raw); // หรือใช้ json5 ถ้า payload ไม่ใช่ JSON มาตรฐาน

      const telemetry = await Telemetry.create({
        binId,
        level: data.level,
        sensorStatus: data.sensorStatus,
        voltage: data.voltage,
        batteryPct: data.batteryPct,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      });

      broadcastRealtime({
        binId: telemetry.binId,
        level: telemetry.level,
        sensorStatus: telemetry.sensorStatus,
        voltage: telemetry.voltage,
        batteryPct: telemetry.batteryPct,
        timestamp: telemetry.timestamp,
      });

      console.log(`💾 Telemetry saved: ${telemetry.binId}`);

      await notifyBinAlerts(
        telemetry.binId
      );

    } catch (error) {
      console.error("❌ MQTT message processing error:", error);
    }
  });

  client.on("error", (error) => {
    console.error("❌ MQTT error:", error);
  });

  return client;
}

export function publishLockCommand(binId: string, action: "lock" | "unlock") {
  if (!mqttClient) {
    throw new Error("MQTT client is not connected");
  }

  if (!mqttClient.connected) {
    throw new Error("MQTT broker is not connected");
  }

  const topic = `bins/${binId}/command/lock`;

  const payload = JSON.stringify({
    action,
    timestamp: new Date().toISOString(),
  });

  mqttClient.publish(topic, payload, (error) => {
    if (error) {
      console.error("❌ MQTT lock command error:", error);
      return;
    }
    console.log(`🔐 Lock command sent: ${topic} → ${action}`);
  });
}
