import mqtt from "mqtt";

const client = mqtt.connect(
  "mqtt://localhost:1883"
);

client.on("connect", () => {
  console.log("MQTT Test Connected");

  client.subscribe(
    "bins/A-001/command/lock",
    () => {
      console.log(
        "Subscribed to lock command"
      );

      client.publish(
        "bins/A-001/command/lock",
        JSON.stringify({
          action: "unlock",
        })
      );
    }
  );
});

client.on("message", (topic, message) => {
  console.log(
    "📨 Topic:",
    topic
  );

  console.log(
    "📦 Payload:",
    message.toString()
  );

  client.end();
});