#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <HTTPClient.h>
#include "SensorController.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

// =====================================================
// WiFi
// =====================================================

const char* WIFI_SSID = "Laphatsanan_2.4G";
const char* WIFI_PASSWORD = "your_wifi_password"; // Replace with your actual WiFi password

// =====================================================
// MQTT
// =====================================================

const char* MQTT_SERVER = "192.168.1.147";
const int MQTT_PORT = 1883;

// =====================================================
// Smart Bin
// =====================================================

const char* BIN_ID = "A-001";

const char* SERVER_URL =
  "http://192.168.1.147:4000";

const char* DEVICE_API_KEY =
  "your_device_api_key"; // Replace with your actual device API key

// =====================================================
// Device IDs
// ต้องตรงกับ Device ID ในหน้า Devices
// =====================================================

const char* ESP32_DEVICE_ID =
  "ESP32-A001";

String bootId;

const char* IR_DEVICE_ID =
  "IR-A001";

const char* PROXIMITY_DEVICE_ID =
  "proximity-A001";

const char* ULTRASONIC_DEVICE_ID =
  "ultrasonic-A001";

const char* SERVO_CAN_DEVICE_ID =
  "servo-can-A001";

const char* SERVO_LOCK_DEVICE_ID =
  "servo-lock-A001";

const char* RELAY_CAN_DEVICE_ID =
  "relay-can-A001";

const char* RELAY_LOCK_DEVICE_ID =
  "relay-lock-A001";

// =====================================================
// MQTT Topics
// =====================================================

String telemetryTopic =
  String("bins/") +
  BIN_ID +
  "/telemetry";

String wasteTopic =
  String("bins/") +
  BIN_ID +
  "/event/waste";

// =====================================================
// Sensor Pins
// =====================================================

// Proximity
#define PROXI_PIN 34

// IR
#define IR_PIN 35

// =====================================================
// Relay + Servo
// =====================================================

// CAN
#define RELAY_PIN 19
#define SERVO_PIN 32

// Door Lock
#define RELAY_PIN2 21
#define SERVO_PIN2 27

Servo servo1;
Servo servo2;
const int LOCK_ANGLE = 23;
const int UNLOCK_ANGLE = 120;
bool doorLocked = true;

const int CAN_HOME_ANGLE = 23;
const int CAN_SORT_ANGLE = 120;
// LOW activates most relay modules. Set HIGH if your module is active-high.
const int CAN_RELAY_ON_LEVEL = LOW;
const int CAN_RELAY_OFF_LEVEL = CAN_RELAY_ON_LEVEL == LOW ? HIGH : LOW;
const int IR_ACTIVE_LEVEL = LOW;
const int PROXIMITY_ACTIVE_LEVEL = LOW;
portMUX_TYPE sensorMux = portMUX_INITIALIZER_UNLOCKED;
bool currentIrDetected = false;
bool currentCanDetected = false;
bool currentCanServoOpen = false;
bool currentCanRelayOn = false;

// =====================================================
// Ultrasonic
// =====================================================

#define TRIG_PIN 4
#define ECHO_PIN 22

#define EMPTY_DISTANCE 70.0
#define FULL_DISTANCE 5.0

// =====================================================
// IR Counter
// =====================================================

int irCount = 0;
int publishedIrCount = 0;

int readIrCount() {
  portENTER_CRITICAL(&sensorMux);
  const int count = irCount;
  portEXIT_CRITICAL(&sensorMux);
  return count;
}

void sensorTask(void*) {
  SensorController controller;
  bool previousServoOpen = false;
  bool previousPowerOn = false;
  for (;;) {
    controller.update(digitalRead(IR_PIN) == IR_ACTIVE_LEVEL,
                      digitalRead(PROXI_PIN) == PROXIMITY_ACTIVE_LEVEL, millis());
    if (controller.powerOn != previousPowerOn) {
      digitalWrite(RELAY_PIN, controller.powerOn ? CAN_RELAY_ON_LEVEL : CAN_RELAY_OFF_LEVEL);
      previousPowerOn = controller.powerOn;
    }
    // Move locally before any HTTP report. No delay during the four-second hold.
    if (controller.servoOpen != previousServoOpen) {
      servo1.write(controller.servoOpen ? CAN_SORT_ANGLE : CAN_HOME_ANGLE);
      previousServoOpen = controller.servoOpen;
    }
    portENTER_CRITICAL(&sensorMux);
    if (controller.irTriggered) ++irCount;
    currentIrDetected = controller.irDetected;
    currentCanDetected = controller.proximityDetected;
    currentCanServoOpen = controller.servoOpen;
    currentCanRelayOn = controller.powerOn;
    portEXIT_CRITICAL(&sensorMux);
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

// =====================================================
// WiFi + MQTT
// =====================================================

WiFiClient espClient;

PubSubClient mqttClient(
  espClient
);

// =====================================================
// Timers
// =====================================================

// Telemetry 5 sec
unsigned long lastSend = 0;

const unsigned long sendInterval =
  5000;

// Serial 2 sec
unsigned long lastSerial = 0;

const unsigned long serialInterval =
  2000;

// Device heartbeat 3 sec
unsigned long lastHeartbeat = 0;

const unsigned long heartbeatInterval =
  3000;

// =====================================================
// Ultrasonic
// =====================================================

float readDistance() {

  digitalWrite(
    TRIG_PIN,
    LOW
  );

  delayMicroseconds(2);

  digitalWrite(
    TRIG_PIN,
    HIGH
  );

  delayMicroseconds(10);

  digitalWrite(
    TRIG_PIN,
    LOW
  );

  long duration =
    pulseIn(
      ECHO_PIN,
      HIGH,
      30000
    );

  if (duration == 0) {

    return -1;
  }

  float distance =
    duration *
    0.0343 /
    2.0;

  return distance;
}

// =====================================================
// WiFi
// =====================================================

void connectWiFi() {

  if (
    WiFi.status() ==
    WL_CONNECTED
  ) {

    return;
  }

  Serial.print(
    "Connecting WiFi"
  );

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  while (
    WiFi.status() !=
    WL_CONNECTED
  ) {

    delay(500);

    Serial.print(".");
  }

  Serial.println();

  Serial.println(
    "WiFi connected"
  );

  Serial.print(
    "ESP32 IP: "
  );

  Serial.println(
    WiFi.localIP()
  );
}

// =====================================================
// MQTT
// =====================================================

void connectMQTT() {

  while (
    !mqttClient.connected()
  ) {

    Serial.print(
      "Connecting MQTT..."
    );

    String clientId =
      "ESP32-" +
      String(BIN_ID);

    if (
      mqttClient.connect(
        clientId.c_str()
      )
    ) {

      Serial.println(
        "connected"
      );

    } else {

      Serial.print(
        "failed, state="
      );

      Serial.println(
        mqttClient.state()
      );

      delay(3000);
    }
  }
}

// =====================================================
// Device Heartbeat
// =====================================================

bool acknowledgeRestart() {
  HTTPClient acknowledgement;
  acknowledgement.setConnectTimeout(1000);
  acknowledgement.setTimeout(1500);
  acknowledgement.begin(String(SERVER_URL) + "/api/device/ack-restart");
  acknowledgement.addHeader("Content-Type", "application/json");
  acknowledgement.addHeader("x-api-key", DEVICE_API_KEY);
  const String payload = String("{\"deviceId\":\"") + ESP32_DEVICE_ID + "\"}";
  const int status = acknowledgement.POST(payload);
  if (status != 200) Serial.printf("Restart acknowledgement failed: %d\n", status);
  acknowledgement.end();
  return status == 200;
}

void sendDeviceHeartbeat(
  const char* deviceId
) {

  if (
    WiFi.status() !=
    WL_CONNECTED
  ) {

    return;
  }

  HTTPClient http;
  http.setConnectTimeout(1000);
  http.setTimeout(1500);

  String url =
    String(SERVER_URL) +
    "/api/device/poll?deviceId=" +
    deviceId;
  if (String(deviceId) == ESP32_DEVICE_ID) url += "&bootId=" + bootId;

  http.begin(url);

  http.addHeader(
    "x-api-key",
    DEVICE_API_KEY
  );

  int httpCode =
    http.GET();

  bool restartRequested = false;
  if (httpCode == 200 && String(deviceId) == ESP32_DEVICE_ID) {
    String response = http.getString();
    response.replace(" ", "");
    response.replace("\n", "");
    restartRequested = response.indexOf("\"command\":\"restart\"") >= 0;
  }

  if (httpCode == 200 && String(deviceId) == SERVO_LOCK_DEVICE_ID) {
    String response = http.getString();
    response.replace(" ", "");
    response.replace("\n", "");
    const bool lockRequested = response.indexOf("\"command\":\"on\"") >= 0;
    const bool unlockRequested = response.indexOf("\"command\":\"off\"") >= 0;
    if (lockRequested || unlockRequested) {
      doorLocked = lockRequested;
      servo2.write(doorLocked ? LOCK_ANGLE : UNLOCK_ANGLE);
      delay(600);
      Serial.println(doorLocked ? "Door servo: LOCK" : "Door servo: UNLOCK");
      reportDeviceState(SERVO_LOCK_DEVICE_ID, doorLocked ? "on" : "off");
    }
  }

  Serial.print(
    "Heartbeat "
  );

  Serial.print(
    deviceId
  );

  Serial.print(
    ": "
  );

  Serial.println(
    httpCode
  );

  if (
    httpCode != 200 &&
    httpCode > 0
  ) {

    Serial.println(
      http.getString()
    );
  }

  http.end();
  if (restartRequested && acknowledgeRestart()) {
    Serial.println("Restart command acknowledged; restarting ESP32");
    Serial.flush();
    delay(100);
    ESP.restart();
  }
}

// =====================================================
// Heartbeat อุปกรณ์ทั้งหมด
// =====================================================

void sendAllDeviceHeartbeats() {

  // ESP32
  sendDeviceHeartbeat(
    ESP32_DEVICE_ID
  );

  // IR
  sendDeviceHeartbeat(
    IR_DEVICE_ID
  );

  // Proximity
  sendDeviceHeartbeat(
    PROXIMITY_DEVICE_ID
  );

  // Servo CAN
  sendDeviceHeartbeat(
    SERVO_CAN_DEVICE_ID
  );

  // Servo Door Lock
  sendDeviceHeartbeat(
    SERVO_LOCK_DEVICE_ID
  );

  // Relay CAN
  sendDeviceHeartbeat(
    RELAY_CAN_DEVICE_ID
  );

  // Relay Door Lock
  sendDeviceHeartbeat(
    RELAY_LOCK_DEVICE_ID
  );

  // Ultrasonic:
  // ส่ง heartbeat เฉพาะตอนอ่านค่าได้
  float distance =
    readDistance();

  if (distance >= 0) {

    sendDeviceHeartbeat(
      ULTRASONIC_DEVICE_ID
    );

  } else {

    Serial.println(
      "Ultrasonic heartbeat skipped: No Echo"
    );
  }
}

// =====================================================
// Report Device State
//
// Backend ต้องการ:
// {
//   "deviceId": "...",
//   "state": "on" | "off"
// }
// =====================================================

bool reportDeviceState(
  const char* deviceId,
  const char* state
) {

  if (
    WiFi.status() !=
    WL_CONNECTED
  ) {

    return false;
  }

  HTTPClient http;
  http.setConnectTimeout(1000);
  http.setTimeout(1500);

  String url =
    String(SERVER_URL) +
    "/api/device/report";

  http.begin(url);

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  http.addHeader(
    "x-api-key",
    DEVICE_API_KEY
  );

  String payload =
    "{";

  payload +=
    "\"deviceId\":\"";

  payload +=
    deviceId;

  payload +=
    "\",";

  payload +=
    "\"state\":\"";

  payload +=
    state;

  payload +=
    "\"";

  payload +=
    "}";

  int httpCode =
    http.POST(
      payload
    );

  Serial.print(
    "Report "
  );

  Serial.print(
    deviceId
  );

  Serial.print(
    " -> "
  );

  Serial.print(
    state
  );

  Serial.print(
    " HTTP: "
  );

  Serial.println(
    httpCode
  );

  if (
    httpCode != 200 &&
    httpCode > 0
  ) {

    Serial.println(
      http.getString()
    );
  }

  http.end();
  return httpCode == 200;
}

// =====================================================
// Waste Event
// =====================================================

bool publishWasteEvent() {

  String payload =
    "{";

  payload +=
    "\"sensor\":\"ir\"";

  payload +=
    "}";

  bool result =
    mqttClient.publish(
      wasteTopic.c_str(),
      payload.c_str()
    );

  if (result) {

    Serial.println(
      "Waste Event MQTT OK"
    );

    Serial.print(
      "Topic: "
    );

    Serial.println(
      wasteTopic
    );

    Serial.print(
      "Count: "
    );

    Serial.println(
      readIrCount()
    );

  } else {

    Serial.println(
      "Waste Event MQTT FAILED"
    );
  }
  return result;
}

// =====================================================
// Setup
// =====================================================

void setup() {

  Serial.begin(
    115200
  );
  bootId = String(esp_random(), HEX);

  // ===================================================
  // Sensors
  // ===================================================

  pinMode(
    PROXI_PIN,
    INPUT
  );

  pinMode(
    IR_PIN,
    INPUT
  );

  // ===================================================
  // Relay CAN
  // ===================================================

  pinMode(
    RELAY_PIN,
    OUTPUT
  );

  digitalWrite(
    RELAY_PIN,
    CAN_RELAY_OFF_LEVEL
  );

  // ===================================================
  // Relay Door
  // ===================================================

  pinMode(
    RELAY_PIN2,
    OUTPUT
  );

  digitalWrite(
    RELAY_PIN2,
    HIGH
  );

  // ===================================================
  // Servo CAN
  // ===================================================

  servo1.attach(
    SERVO_PIN
  );

  servo1.write(
    CAN_HOME_ANGLE
  );

  // ===================================================
  // Servo Door
  // ===================================================

  servo2.attach(
    SERVO_PIN2
  );

  servo2.write(
    LOCK_ANGLE
  );

  // ===================================================
  // Ultrasonic
  // ===================================================

  pinMode(
    TRIG_PIN,
    OUTPUT
  );

  pinMode(
    ECHO_PIN,
    INPUT
  );

  digitalWrite(
    TRIG_PIN,
    LOW
  );

  // ===================================================
  // WiFi
  // ===================================================

  if (xTaskCreatePinnedToCore(sensorTask, "bin-sensors", 3072, nullptr, 2, nullptr, 1) != pdPASS) {
    Serial.println("ERROR: sensor task could not start");
    while (true) delay(1000);
  }
  connectWiFi();

  // ===================================================
  // MQTT
  // ===================================================

  mqttClient.setServer(
    MQTT_SERVER,
    MQTT_PORT
  );

  connectMQTT();

  // ===================================================
  // Initial Heartbeats
  // ===================================================

  sendAllDeviceHeartbeats();

  // ===================================================
  // Initial Device States
  // ===================================================

  reportDeviceState(
    IR_DEVICE_ID,
    "off"
  );

  reportDeviceState(
    PROXIMITY_DEVICE_ID,
    "off"
  );

  reportDeviceState(
    SERVO_CAN_DEVICE_ID,
    "off"
  );

  reportDeviceState(
    SERVO_LOCK_DEVICE_ID,
    doorLocked ? "on" : "off"
  );

  reportDeviceState(
    RELAY_CAN_DEVICE_ID,
    "off"
  );

  reportDeviceState(
    RELAY_LOCK_DEVICE_ID,
    "off"
  );

  // ===================================================
  // Serial
  // ===================================================

  Serial.println();

  Serial.println(
    "=============================="
  );

  Serial.println(
    "SMART BIN STARTED"
  );

  Serial.println(
    "=============================="
  );

  Serial.print(
    "BIN ID: "
  );

  Serial.println(
    BIN_ID
  );

  Serial.print(
    "ESP32 DEVICE ID: "
  );

  Serial.println(
    ESP32_DEVICE_ID
  );

  Serial.print(
    "Backend: "
  );

  Serial.println(
    SERVER_URL
  );

  Serial.print(
    "Telemetry: "
  );

  Serial.println(
    telemetryTopic
  );

  Serial.print(
    "Waste Event: "
  );

  Serial.println(
    wasteTopic
  );

  Serial.println(
    "=============================="
  );
}

// =====================================================
// Loop
// =====================================================

void loop() {

  // ===================================================
  // WiFi
  // ===================================================

  if (
    WiFi.status() !=
    WL_CONNECTED
  ) {

    connectWiFi();
  }

  // ===================================================
  // MQTT
  // ===================================================

  if (
    !mqttClient.connected()
  ) {

    connectMQTT();
  }

  mqttClient.loop();

  // ===================================================
  // Heartbeat อุปกรณ์ทั้งหมด
  // ทุก 3 วินาที
  // ===================================================

  if (
    millis() -
      lastHeartbeat >=
    heartbeatInterval
  ) {

    lastHeartbeat =
      millis();

    sendAllDeviceHeartbeats();
  }

  // ===================================================
  // Sensor readings
  // ===================================================

  bool canDetected, irDetected, canServoOpen, canRelayOn;
  int countSnapshot;
  portENTER_CRITICAL(&sensorMux);
  canDetected = currentCanDetected;
  irDetected = currentIrDetected;
  canServoOpen = currentCanServoOpen;
  canRelayOn = currentCanRelayOn;
  countSnapshot = irCount;
  portEXIT_CRITICAL(&sensorMux);

  static bool reportedIr = false, reportedCan = false, reportedServo = false, reportedRelay = false;
  static unsigned long lastStateReport = 0;
  if (millis() - lastStateReport >= 1000) {
    lastStateReport = millis();
    if (irDetected != reportedIr && reportDeviceState(IR_DEVICE_ID, irDetected ? "on" : "off")) reportedIr = irDetected;
    if (canDetected != reportedCan && reportDeviceState(PROXIMITY_DEVICE_ID, canDetected ? "on" : "off")) reportedCan = canDetected;
    if (canServoOpen != reportedServo && reportDeviceState(SERVO_CAN_DEVICE_ID, canServoOpen ? "on" : "off")) reportedServo = canServoOpen;
    if (canRelayOn != reportedRelay && reportDeviceState(RELAY_CAN_DEVICE_ID, canRelayOn ? "on" : "off")) reportedRelay = canRelayOn;
  }

  // Count locally even while HTTP/MQTT is unavailable; send each pending event.
  static unsigned long lastWasteRetry = 0;
  if (mqttClient.connected() && millis() - lastWasteRetry >= 1000) {
    lastWasteRetry = millis();
    for (int sent = 0; publishedIrCount < countSnapshot && sent < 10; ++sent) {
      if (!publishWasteEvent()) break;
      ++publishedIrCount;
    }
  }
  static int lastPrintedCount = -1;
  if (countSnapshot != lastPrintedCount) {
    lastPrintedCount = countSnapshot;
    Serial.print("IR Count (local): ");
    Serial.println(countSnapshot);
  }

  // ===================================================
  // Serial Sensor Status
  // ===================================================

  if (
    millis() -
      lastSerial >=
    serialInterval
  ) {

    lastSerial =
      millis();

    float distance =
      readDistance();

    Serial.println();

    Serial.println(
      "------------------------------"
    );

    Serial.print(
      "CAN Sensor: "
    );

    if (canDetected) {

      Serial.println(
        "DETECTED"
      );

    } else {

      Serial.println(
        "CLEAR"
      );
    }

    Serial.print(
      "IR Sensor: "
    );

    if (irDetected) {

      Serial.println(
        "DETECTED"
      );

    } else {

      Serial.println(
        "CLEAR"
      );
    }

    Serial.print(
      "IR Count: "
    );

    Serial.println(
      countSnapshot
    );

    if (
      distance >= 0
    ) {

      int fillPercent;

      if (
        distance >=
        EMPTY_DISTANCE
      ) {

        fillPercent =
          0;

      } else if (
        distance <=
        FULL_DISTANCE
      ) {

        fillPercent =
          100;

      } else {

        fillPercent =
          (
            (
              EMPTY_DISTANCE -
              distance
            ) /
            (
              EMPTY_DISTANCE -
              FULL_DISTANCE
            )
          ) * 100.0;
      }

      Serial.print(
        "Distance: "
      );

      Serial.print(
        distance,
        1
      );

      Serial.println(
        " cm"
      );

      Serial.print(
        "Fill Level: "
      );

      Serial.print(
        fillPercent
      );

      Serial.println(
        "%"
      );

    } else {

      Serial.println(
        "Ultrasonic: No Echo"
      );
    }

    Serial.println(
      "------------------------------"
    );
  }

  // ===================================================
  // MQTT Telemetry
  // ทุก 5 วินาที
  // ===================================================

  if (
    millis() -
      lastSend >=
    sendInterval
  ) {

    lastSend =
      millis();

    float distance =
      readDistance();

    if (
      distance < 0
    ) {

      Serial.println(
        "Ultrasonic ERROR"
      );

    } else {

      int level;

      if (
        distance >=
        EMPTY_DISTANCE
      ) {

        level =
          0;

      } else if (
        distance <=
        FULL_DISTANCE
      ) {

        level =
          100;

      } else {

        level =
          (
            (
              EMPTY_DISTANCE -
              distance
            ) /
            (
              EMPTY_DISTANCE -
              FULL_DISTANCE
            )
          ) * 100.0;
      }

      // Test Battery
      float voltage =
        12.6;

      int batteryPct =
        78;

      Serial.println();

      Serial.println(
        "Sending Telemetry"
      );

      Serial.print(
        "Distance: "
      );

      Serial.print(
        distance,
        1
      );

      Serial.println(
        " cm"
      );

      Serial.print(
        "Level: "
      );

      Serial.print(
        level
      );

      Serial.println(
        "%"
      );

      Serial.print(
        "IR Count: "
      );

      Serial.println(
        countSnapshot
      );

      // =================================================
      // MQTT JSON
      // =================================================

      String payload =
        "{";

      payload +=
        "\"level\":";

      payload +=
        String(level);

      payload +=
        ",\"sensorStatus\":{";

      payload +=
        "\"capacitive\":\"ok\",";

      payload +=
        "\"inductive\":\"ok\",";

      payload +=
        "\"level\":\"ok\"";

      payload +=
        "}";

      payload +=
        ",\"voltage\":";

      payload +=
        String(
          voltage,
          1
        );

      payload +=
        ",\"batteryPct\":";

      payload +=
        String(
          batteryPct
        );

      payload +=
        "}";

      Serial.println();

      Serial.println(
        "MQTT JSON:"
      );

      Serial.println(
        payload
      );

      bool result =
        mqttClient.publish(
          telemetryTopic.c_str(),
          payload.c_str()
        );

      if (result) {

        Serial.println(
          "MQTT publish OK"
        );

      } else {

        Serial.println(
          "MQTT publish FAILED"
        );
      }
    }
  }

  delay(50);
}
