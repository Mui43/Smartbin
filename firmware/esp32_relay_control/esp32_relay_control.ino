#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- ตั้งค่า WiFi และ API ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ใช้ IP ของเครื่องที่รัน backend ในวง LAN เดียวกัน ห้ามใช้ localhost บน ESP32
const char* serverUrl = "http://192.168.1.100:4000";
// ต้องตรงกับ DEVICE_API_KEY ที่ตั้งค่าให้ backend
const char* apiKey = "YOUR_DEVICE_API_KEY";
// ต้องตรงกับ Device ID ที่ลงทะเบียนในหน้า Devices
const char* deviceId = "esp32-01";

// --- ตั้งค่า Hardware ---
const int RELAY_PIN = 26;
unsigned long lastPollTime = 0;
const unsigned long pollInterval = 3000; // Poll ทุกๆ 3 วินาที

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // สถานะเริ่มต้น OFF

  // เชื่อมต่อ WiFi
  WiFi.begin(ssid, password);
  WiFi.setAutoReconnect(true);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  reportStatus("off");
}

void loop() {
  if (millis() - lastPollTime >= pollInterval) {
    lastPollTime = millis();
    if (WiFi.status() == WL_CONNECTED) {
      checkCommand();
    } else {
      WiFi.reconnect();
    }
  }
}

// ฟังก์ชันดึงคำสั่ง (GET /api/device/poll)
void checkCommand() {
  HTTPClient http;
  String url = String(serverUrl) + "/api/device/poll?deviceId=" + deviceId;

  http.begin(url);
  http.addHeader("x-api-key", apiKey);

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();

    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      const char* command = doc["command"]; // "on", "off", หรือ null

      if (command != NULL && strcmp(command, "null") != 0) {
        Serial.print("Received command: ");
        Serial.println(command);

        if (strcmp(command, "on") == 0) {
          digitalWrite(RELAY_PIN, HIGH);
          reportStatus("on");
        } else if (strcmp(command, "off") == 0) {
          digitalWrite(RELAY_PIN, LOW);
          reportStatus("off");
        }
      }
    }
  } else {
    Serial.printf("Poll failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ฟังก์ชันรายงานสถานะกลับ (POST /api/device/report)
void reportStatus(const char* state) {
  HTTPClient http;
  String url = String(serverUrl) + "/api/device/report";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);

  StaticJsonDocument<200> doc;
  doc["deviceId"] = deviceId;
  doc["state"] = state;

  String jsonBody;
  serializeJson(doc, jsonBody);

  int httpCode = http.POST(jsonBody);
  if (httpCode == HTTP_CODE_OK) {
    Serial.println("Reported state successfully!");
  } else {
    Serial.printf("Report failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}
