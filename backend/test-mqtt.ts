import mqtt from "mqtt";

const client = mqtt.connect("mqtt://localhost:1883");

const payload = {
  level: 97,
  sensorStatus: {
    capacitive: "ok",
    inductive: "ok",
    level: "ok",
  },
  voltage: 12.6,
  batteryPct: 78,
};

client.on("connect", () => {
  console.log("MQTT Publisher connected");

  client.publish(
    "bins/A-001/telemetry",
    JSON.stringify(payload),
    () => {
      console.log("Telemetry sent");
      client.end();
    }
  );
});