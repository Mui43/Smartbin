#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <HTTPClient.h>

// =====================================================
// WiFi
// =====================================================

const char* WIFI_SSID = "Laphatsanan_2.4G";
const char* WIFI_PASSWORD = "0875917884";

// =====================================================
// MQTT
// =====================================================

const char* MQTT_SERVER = "192.168.1.147";
const int MQTT_PORT = 1883;

// =====================================================
// Smart Bin
// =====================================================

const char* BIN_ID = "A-001";

const char* SERVER_URL = "http://192.168.1.147:4000";

const char* DEVICE_API_KEY = "smartbin-A001-9fK2xP7mQ4vL8sT1";

// =====================================================
// Device IDs
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

String telemetryTopic = String("bins/") + BIN_ID + "/telemetry";
String wasteTopic = String("bins/") + BIN_ID + "/event/waste";

// =====================================================
// Sensor Pins
// =====================================================

#define PROXI_PIN 34
#define IR_PIN 35

// =====================================================
// Relay + Servo
// =====================================================

#define RELAY_PIN 19
#define SERVO_PIN 32

#define RELAY_PIN2 21
#define SERVO_PIN2 27

Servo servo1;
Servo servo2;

const int LOCK_ANGLE = 23;
const int UNLOCK_ANGLE = 120;

bool doorLocked = true;

bool canProcessed = false;
bool irProcessed = false;

// =====================================================
// Servo CAN Timer
// =====================================================

bool servoCanActive = false;
unsigned long servoCanStart = 0;
const unsigned long servoCanDuration = 4000;

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

// =====================================================
// WiFi + MQTT
// =====================================================

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// =====================================================
// Timers
// =====================================================

unsigned long lastSend = 0;
const unsigned long sendInterval = 5000;

unsigned long lastSerial = 0;
const unsigned long serialInterval = 2000;

unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 10000;

// 🟢 เช็กคำสั่งปลดล็อกประตูเร็วขึ้นทุกๆ 1.5 วินาที
unsigned long lastDoorPoll = 0;
const unsigned long doorPollInterval = 1500;

// =====================================================
// Function Prototype
// =====================================================

void reportDeviceState(const char* deviceId, const char* state);

// =====================================================
// Ultrasonic
// =====================================================

float readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration == 0) {
    return -1;
  }

  float distance = duration * 0.0343 / 2.0;
  return distance;
}

// =====================================================
// WiFi
// =====================================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.print("Connecting WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

// =====================================================
// MQTT
// =====================================================

void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting MQTT...");

    String clientId = "ESP32-" + String(BIN_ID);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, state=");
      Serial.println(mqttClient.state());
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
  // 🟢 เพิ่ม Timeout ป้องกัน ESP32 ค้าง
  http.setConnectTimeout(1000);
  http.setTimeout(1000);

  String url =
    String(SERVER_URL) +
    "/api/device/poll?deviceId=" +
    deviceId;
  if (String(deviceId) == ESP32_DEVICE_ID) url += "&bootId=" + bootId;

  http.begin(url);
  http.addHeader("x-api-key", DEVICE_API_KEY);

  int httpCode = http.GET();

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

    // 🟢 ตรวจสอบรองรับทั้ง "lock"/"on" และ "unlock"/"off"
    bool lockRequested = (response.indexOf("\"command\":\"lock\"") >= 0) || (response.indexOf("\"command\":\"on\"") >= 0);
    bool unlockRequested = (response.indexOf("\"command\":\"unlock\"") >= 0) || (response.indexOf("\"command\":\"off\"") >= 0);

    if (lockRequested || unlockRequested) {
      doorLocked = lockRequested;

      servo2.write(doorLocked ? LOCK_ANGLE : UNLOCK_ANGLE);
      delay(600);

      Serial.println(doorLocked ? "Door servo: LOCK" : "Door servo: UNLOCK");

      reportDeviceState(SERVO_LOCK_DEVICE_ID, doorLocked ? "on" : "off");
    }
  }

  Serial.print("Heartbeat ");
  Serial.print(deviceId);
  Serial.print(": ");
  Serial.println(httpCode);

  if (httpCode != 200 && httpCode > 0) {
    Serial.println(http.getString());
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
// Heartbeat ทั้งหมด
// =====================================================

void sendAllDeviceHeartbeats() {
  sendDeviceHeartbeat(ESP32_DEVICE_ID);
  sendDeviceHeartbeat(IR_DEVICE_ID);
  sendDeviceHeartbeat(PROXIMITY_DEVICE_ID);
  sendDeviceHeartbeat(SERVO_CAN_DEVICE_ID);
  sendDeviceHeartbeat(SERVO_LOCK_DEVICE_ID);
  sendDeviceHeartbeat(RELAY_CAN_DEVICE_ID);
  sendDeviceHeartbeat(RELAY_LOCK_DEVICE_ID);

  float distance = readDistance();

  if (distance >= 0) {
    sendDeviceHeartbeat(ULTRASONIC_DEVICE_ID);
  } else {
    Serial.println("Ultrasonic heartbeat skipped: No Echo");
  }
}

// =====================================================
// Report Device State
// =====================================================

void reportDeviceState(const char* deviceId, const char* state) {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.setConnectTimeout(1000);
  http.setTimeout(1000);

  String url = String(SERVER_URL) + "/api/device/report";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", DEVICE_API_KEY);

  String payload = "{";
  payload += "\"deviceId\":\"";
  payload += deviceId;
  payload += "\",";
  payload += "\"state\":\"";
  payload += state;
  payload += "\"";
  payload += "}";

  int httpCode = http.POST(payload);

  Serial.print("Report ");
  Serial.print(deviceId);
  Serial.print(" -> ");
  Serial.print(state);
  Serial.print(" HTTP: ");
  Serial.println(httpCode);

  if (httpCode != 200 && httpCode > 0) {
    Serial.println(http.getString());
  }

  http.end();
}

// =====================================================
// Waste Event
// =====================================================

void publishWasteEvent() {
  String payload = "{\"sensor\":\"ir\"}";

  bool result = mqttClient.publish(wasteTopic.c_str(), payload.c_str());

  if (result) {
    Serial.println("Waste Event MQTT OK");
    Serial.print("Topic: ");
    Serial.println(wasteTopic);
    Serial.print("Count: ");
    Serial.println(irCount);
  } else {
    Serial.println("Waste Event MQTT FAILED");
  }
}

// =====================================================
// Setup
// =====================================================

void setup() {
  Serial.begin(115200);

  pinMode(PROXI_PIN, INPUT);
  pinMode(IR_PIN, INPUT);
  Serial.begin(
    115200
  );
  bootId = String(esp_random(), HEX);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);

  pinMode(RELAY_PIN2, OUTPUT);
  digitalWrite(RELAY_PIN2, HIGH);

  // Servo CAN
  servo1.attach(SERVO_PIN);
  servo1.write(23);

  // Servo Door
  servo2.attach(SERVO_PIN2);
  servo2.write(LOCK_ANGLE);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  connectWiFi();

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  connectMQTT();

  // Heartbeat ครั้งแรก
  sendAllDeviceHeartbeats();

  // Initial states
  reportDeviceState(IR_DEVICE_ID, "off");
  reportDeviceState(PROXIMITY_DEVICE_ID, "off");
  reportDeviceState(SERVO_CAN_DEVICE_ID, "off");
  reportDeviceState(SERVO_LOCK_DEVICE_ID, doorLocked ? "on" : "off");
  reportDeviceState(RELAY_CAN_DEVICE_ID, "off");
  reportDeviceState(RELAY_LOCK_DEVICE_ID, "off");

  Serial.println();
  Serial.println("==============================");
  Serial.println("SMART BIN STARTED");
  Serial.println("==============================");
  Serial.print("BIN ID: ");
  Serial.println(BIN_ID);
  Serial.print("ESP32 DEVICE ID: ");
  Serial.println(ESP32_DEVICE_ID);
  Serial.println("==============================");
}

// =====================================================
// Loop
// =====================================================

void loop() {
  // ===================================================
  // WiFi
  // ===================================================
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // ===================================================
  // MQTT
  // ===================================================
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  // ===================================================
  // อ่าน Sensor ก่อน Heartbeat
  // ===================================================
  bool canDetected = (digitalRead(PROXI_PIN) == LOW);
  bool irDetected = (digitalRead(IR_PIN) == LOW);

  // ===================================================
  // IR Counter
  // ===================================================
  if (irDetected && !irProcessed) {
    irProcessed = true;
    irCount++;

    Serial.println();
    Serial.println("=======================");
    Serial.println("WASTE DETECTED");
    Serial.print("IR Count: ");
    Serial.println(irCount);
    Serial.println("=======================");

    if (mqttClient.connected()) {
      publishWasteEvent();
    }

    reportDeviceState(IR_DEVICE_ID, "on");
  }

  // ===================================================
  // Reset IR
  // ===================================================
  if (!irDetected && irProcessed) {
    irProcessed = false;
    reportDeviceState(IR_DEVICE_ID, "off");
  }

  // ===================================================
  // CAN / Proximity
  // ===================================================
  if (canDetected && !canProcessed && !servoCanActive) {
    canProcessed = true;

    Serial.println();
    Serial.println("CAN DETECTED");

    servo1.write(120);
    servoCanStart = millis();
    servoCanActive = true;

    digitalWrite(RELAY_PIN, HIGH);

    reportDeviceState(PROXIMITY_DEVICE_ID, "on");
    reportDeviceState(RELAY_CAN_DEVICE_ID, "on");
    reportDeviceState(SERVO_CAN_DEVICE_ID, "on");
  }

  // ===================================================
  // Servo CAN Timer
  // ===================================================
  if (servoCanActive && millis() - servoCanStart >= servoCanDuration) {
    servo1.write(23);
    servoCanActive = false;

    Serial.println("Servo returned");

    reportDeviceState(SERVO_CAN_DEVICE_ID, "off");
    reportDeviceState(RELAY_CAN_DEVICE_ID, "off");
  }

  // ===================================================
  // Reset Proximity
  // ===================================================
  if (!canDetected && canProcessed) {
    canProcessed = false;
    reportDeviceState(PROXIMITY_DEVICE_ID, "off");
  }

  // ===================================================
  // 🟢 Poll ปลดล็อกประตูทุก 1.5 วินาที (ตอบสนองไว)
  // ===================================================
  if (millis() - lastDoorPoll >= doorPollInterval) {
    lastDoorPoll = millis();
    sendDeviceHeartbeat(SERVO_LOCK_DEVICE_ID);
  }

  // ===================================================
  // Heartbeat รวมอุปกรณ์ทั้งหมด ทุก 10 วินาที
  // ===================================================
  if (millis() - lastHeartbeat >= heartbeatInterval) {
    lastHeartbeat = millis();
    sendAllDeviceHeartbeats();
  }

  // ===================================================
  // Serial แสดงผล ทุก 2 วินาที
  // ===================================================
  if (millis() - lastSerial >= serialInterval) {
    lastSerial = millis();
    float distance = readDistance();

    Serial.println();
    Serial.println("------------------------------");
    Serial.print("CAN Sensor: ");
    Serial.println(canDetected ? "DETECTED" : "CLEAR");

    Serial.print("IR Sensor: ");
    Serial.println(irDetected ? "DETECTED" : "CLEAR");

    Serial.print("IR Count: ");
    Serial.println(irCount);

    if (distance >= 0) {
      int fillPercent;
      if (distance >= EMPTY_DISTANCE) {
        fillPercent = 0;
      } else if (distance <= FULL_DISTANCE) {
        fillPercent = 100;
      } else {
        fillPercent = ((EMPTY_DISTANCE - distance) / (EMPTY_DISTANCE - FULL_DISTANCE)) * 100.0;
      }

      Serial.print("Distance: ");
      Serial.print(distance, 1);
      Serial.println(" cm");

      Serial.print("Fill Level: ");
      Serial.print(fillPercent);
      Serial.println("%");
    } else {
      Serial.println("Ultrasonic: No Echo");
    }

    Serial.println("------------------------------");
  }

  // ===================================================
  // MQTT Telemetry ทุก 5 วินาที
  // ===================================================
  if (millis() - lastSend >= sendInterval) {
    lastSend = millis();
    float distance = readDistance();

    if (distance < 0) {
      Serial.println("Ultrasonic ERROR");
    } else {
      int level;
      if (distance >= EMPTY_DISTANCE) {
        level = 0;
      } else if (distance <= FULL_DISTANCE) {
        level = 100;
      } else {
        level = ((EMPTY_DISTANCE - distance) / (EMPTY_DISTANCE - FULL_DISTANCE)) * 100.0;
      }

      float voltage = 12.6;
      int batteryPct = 78;

      String payload = "{";
      payload += "\"level\":";
      payload += String(level);
      payload += ",\"sensorStatus\":{";
      payload += "\"capacitive\":\"ok\",";
      payload += "\"inductive\":\"ok\",";
      payload += "\"level\":\"ok\"";
      payload += "}";
      payload += ",\"voltage\":";
      payload += String(voltage, 1);
      payload += ",\"batteryPct\":";
      payload += String(batteryPct);
      payload += "}";

      bool result = mqttClient.publish(telemetryTopic.c_str(), payload.c_str());

      Serial.println();
      Serial.println("MQTT JSON:");
      Serial.println(payload);

      if (result) {
        Serial.println("MQTT publish OK");
      } else {
        Serial.println("MQTT publish FAILED");
      }
    }
  }

  delay(20);
}
