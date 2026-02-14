/**
 * ESP32-S3 Emission Tracker - Production Version
 * Based on working debug version with full sensor integration
 */

#include <ArduinoJson.h>
#include <U8x8lib.h>
#include <WebSocketsClient.h>
#include <WiFi.h>
#include <Wire.h>

// Sensor Libraries
#include <Adafruit_BME280.h>
#include <Adafruit_SGP30.h>

// Configuration
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";
const char *ws_host = "YOUR_PC_IP";
const int ws_port = 3000;

#define RELAY_PIN 43
#define DUST_PIN 44      // PM2.5 sensor pin
#define DUST_PM10_PIN 10 // PM10 sensor pin (SWD10)

// I2C Devices
U8X8_SSD1306_128X64_NONAME_HW_I2C u8x8(U8X8_PIN_NONE);
WebSocketsClient webSocket;
Adafruit_SGP30 sgp;
Adafruit_BME280 bme;

// Variables
bool isConnected = false;
bool bmeInitialized = false;
bool sgpInitialized = false;
unsigned long lastSendTime = 0;
unsigned long sgpStartTime = 0;
int messageCount = 0;

// Dust sensor (PM2.5)
unsigned long dustStartTime = 0;
unsigned long lowpulseoccupancy = 0;
float concentration = 0;

// Dust sensor (PM10)
unsigned long dustPM10StartTime = 0;
unsigned long lowpulseoccupancyPM10 = 0;
float concentrationPM10 = 0;

// Timing - CRITICAL: Don't make these too frequent!
const unsigned long sendInterval = 3000;    // 3 seconds (was 2, caused issues)
const unsigned long dustSampleTime = 30000; // 30 seconds (default)
// const unsigned long dustSampleTime = 15000; // 15 seconds (faster, less
// accurate) const unsigned long dustSampleTime = 10000; // 10 seconds (fastest,
// least accurate)

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println("ESP32-S3 Emission Tracker");
  Serial.println("========================================\n");

  // GPIO
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  pinMode(DUST_PIN, INPUT);      // PM2.5
  pinMode(DUST_PM10_PIN, INPUT); // PM10

  // I2C
  Wire.begin();
  Wire.setClock(100000);

  // OLED - Initialize once, update rarely
  Serial.println("[OLED] Initializing...");
  u8x8.begin();
  u8x8.setFlipMode(1);
  u8x8.setFont(u8x8_font_chroma48medium8_r);
  u8x8.clear();
  u8x8.drawString(0, 0, "Emission Track");
  u8x8.drawString(0, 1, "Starting...");
  Serial.println("[OLED] ✓ OK");

  // SGP30
  Serial.println("[SGP30] Initializing...");
  if (sgp.begin()) {
    sgp.IAQinit();
    sgpStartTime = millis();
    sgpInitialized = true;
    u8x8.drawString(0, 2, "SGP30: OK");
    Serial.println("[SGP30] ✓ OK");
  } else {
    u8x8.drawString(0, 2, "SGP30: FAIL");
    Serial.println("[SGP30] ✗ FAILED (continuing anyway)");
  }

  // BME280
  Serial.println("[BME280] Initializing...");
  if (bme.begin(0x76) || bme.begin(0x77)) {
    bmeInitialized = true;
    u8x8.drawString(0, 3, "BME280: OK");
    Serial.println("[BME280] ✓ OK");
  } else {
    u8x8.drawString(0, 3, "BME280: FAIL");
    Serial.println("[BME280] ✗ FAILED (continuing anyway)");
  }

  delay(1000);

  // WiFi
  Serial.println("[WiFi] Connecting...");
  u8x8.drawString(0, 5, "WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  WiFi.setTxPower(WIFI_POWER_11dBm);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] ✗ FAILED!");
    u8x8.drawString(0, 6, "WiFi: FAIL");
    while (1)
      delay(10);
  }

  Serial.println("[WiFi] ✓ Connected");
  Serial.printf("[WiFi] IP: %s\n", WiFi.localIP().toString().c_str());
  u8x8.drawString(0, 6, "WiFi: OK");

  delay(500);

  // WebSocket
  Serial.println("[WS] Setting up...");
  webSocket.begin(ws_host, ws_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  Serial.println("[WS] ✓ Configured");

  u8x8.drawString(0, 7, "Ready!");

  dustStartTime = millis();
  dustPM10StartTime = millis();

  Serial.println("\n✓ Initialization complete");
  Serial.printf("Free heap: %d bytes\n\n", ESP.getFreeHeap());
}

void loop() {
  // CRITICAL: Call webSocket.loop() FIRST and OFTEN
  webSocket.loop();

  // Read PM2.5 dust sensor (non-blocking, lightweight)
  unsigned long duration = pulseIn(DUST_PIN, LOW, 100000); // 100ms timeout
  if (duration > 0) {
    lowpulseoccupancy += duration;
  }

  // Read PM10 dust sensor (non-blocking, lightweight)
  unsigned long durationPM10 =
      pulseIn(DUST_PM10_PIN, LOW, 100000); // 100ms timeout
  if (durationPM10 > 0) {
    lowpulseoccupancyPM10 += durationPM10;
  }

  // Debug output every 5 seconds to check if sensor is reading
  static unsigned long lastDustDebug = 0;
  if (millis() - lastDustDebug > 5000) {
    lastDustDebug = millis();
    Serial.printf("[Dust Debug] PM2.5 Pin:%d LPO:%lu | PM10 Pin:%d LPO:%lu\n",
                  DUST_PIN, lowpulseoccupancy, DUST_PM10_PIN,
                  lowpulseoccupancyPM10);

    // Check if sensor is connected (read pin state)
    int pinStatePM25 = digitalRead(DUST_PIN);
    int pinStatePM10 = digitalRead(DUST_PM10_PIN);
    Serial.printf("[Dust Debug] PM2.5 Pin State: %d | PM10 Pin State: %d\n",
                  pinStatePM25, pinStatePM10);

    if (lowpulseoccupancy == 0 && lowpulseoccupancyPM10 == 0) {
      Serial.println("[Dust Debug] ⚠️ WARNING: No pulses detected! Check:");
      Serial.println("  1. Sensor wiring (voltage divider installed?)");
      Serial.println("  2. Sensor power supply (5V connected?)");
      Serial.println("  3. Pin connections (RX7/SWD10 correct?)");
      Serial.println("  4. Sensor preheat (3 minutes completed?)");
    }
  }

  // Calculate PM2.5 every 30s
  if ((millis() - dustStartTime) > dustSampleTime) {
    float ratio = lowpulseoccupancy / (dustSampleTime * 10.0);

    // Check if we have valid data (ratio > 0 means pulses were detected)
    if (lowpulseoccupancy == 0) {
      Serial.println(
          "[Dust] ⚠️ PM2.5: No pulses detected - sensor may not be working!");
      Serial.println(
          "[Dust] ⚠️ Check wiring, power supply, and voltage divider!");
      // Keep previous value or set to 0, don't use 0.62 (formula constant)
      if (concentration == 0.62) {
        concentration = 0; // Reset to 0 if it's just the formula constant
      }
    } else {
      concentration =
          1.1 * pow(ratio, 3) - 3.8 * pow(ratio, 2) + 520 * ratio + 0.62;
      Serial.printf("[Dust] PM2.5: %.2f (Ratio:%.4f LPO:%lu μs)\n",
                    concentration, ratio, lowpulseoccupancy);
    }

    lowpulseoccupancy = 0;
    dustStartTime = millis();
  }

  // Calculate PM10 every 30s
  if ((millis() - dustPM10StartTime) > dustSampleTime) {
    float ratioPM10 = lowpulseoccupancyPM10 / (dustSampleTime * 10.0);

    // Check if we have valid data
    if (lowpulseoccupancyPM10 == 0) {
      Serial.println(
          "[Dust] ⚠️ PM10: No pulses detected - sensor may not be working!");
      Serial.println(
          "[Dust] ⚠️ Check wiring, power supply, and voltage divider!");
      // Keep previous value or set to 0, don't use 0.62 (formula constant)
      if (concentrationPM10 == 0.62) {
        concentrationPM10 = 0; // Reset to 0 if it's just the formula constant
      }
    } else {
      concentrationPM10 = 1.1 * pow(ratioPM10, 3) - 3.8 * pow(ratioPM10, 2) +
                          520 * ratioPM10 + 0.62;
      Serial.printf("[Dust] PM10: %.2f (Ratio:%.4f LPO:%lu μs)\n",
                    concentrationPM10, ratioPM10, lowpulseoccupancyPM10);
    }

    lowpulseoccupancyPM10 = 0;
    dustPM10StartTime = millis();
  }

  // Send data every 3 seconds (NOT 2, too fast!)
  if (isConnected && (millis() - lastSendTime > sendInterval)) {
    lastSendTime = millis();
    sendSensorData();
  }

  delay(10); // Small delay for stability
}

void sendSensorData() {
  // Read sensors - FAST, no blocking!
  uint16_t voc = 0, eco2 = 0, h2 = 0, ethanol = 0;
  float temp = 0, hum = 0, press = 0;

  // SGP30 - Only if initialized and ready
  bool sgpReady = sgpInitialized && (millis() - sgpStartTime > 15000);
  if (sgpReady) {
    if (sgp.IAQmeasure()) {
      voc = sgp.TVOC;
      eco2 = sgp.eCO2;
    }
    // Read raw values ONLY if IAQ succeeded
    if (voc > 0 && sgp.IAQmeasureRaw()) {
      h2 = sgp.rawH2;
      ethanol = sgp.rawEthanol;
    }
  }

  // BME280 - Only if initialized
  if (bmeInitialized) {
    temp = bme.readTemperature();
    hum = bme.readHumidity();
    press = bme.readPressure() / 100.0F;
  }

  // Relay control
  bool relayState = (voc > 250);
  digitalWrite(RELAY_PIN, relayState ? HIGH : LOW);

  // Build JSON - Keep it simple!
  StaticJsonDocument<512> doc; // Increased size to ensure PM10 fits
  doc["type"] = "sensor_data";
  doc["device"] = "ESP32-S3";
  doc["voc"] = voc;
  doc["eco2"] = eco2;
  doc["h2"] = h2;
  doc["ethanol"] = ethanol;
  doc["pm25"] = concentration;
  doc["pm10"] = concentrationPM10; // Always include, even if 0
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["pressure"] = press;
  doc["status"] = relayState ? "Unhealthy" : "Healthy";
  doc["relay_state"] = relayState ? "ON" : "OFF";
  doc["heap"] = ESP.getFreeHeap();

  String jsonString;
  serializeJson(doc, jsonString);

  // Debug: Log PM10 value before sending
  Serial.printf("[JSON Debug] PM10=%.2f PM25=%.2f\n", concentrationPM10,
                concentration);

  // Send
  bool result = webSocket.sendTXT(jsonString);

  if (result) {
    messageCount++;
    Serial.printf("[WS] → #%d (%d bytes) PM10=%.2f\n", messageCount,
                  jsonString.length(), concentrationPM10);

    // Update OLED every 5 messages (more frequent for better visibility)
    if (messageCount % 5 == 0) {
      updateDisplay(voc, eco2, temp, hum, press, concentration,
                    concentrationPM10, relayState);
      Serial.printf("[Data] VOC:%d eCO2:%d T:%.1f H:%.1f P:%.1f PM2.5:%.1f "
                    "PM10:%.1f Relay:%s\n",
                    voc, eco2, temp, hum, press, concentration,
                    concentrationPM10, relayState ? "ON" : "OFF");
    }
  } else {
    Serial.println("[WS] ✗ Send failed");
  }
}

void updateDisplay(uint16_t voc, uint16_t eco2, float temp, float hum,
                   float press, float pm25, float pm10, bool relay) {
  // OLED Display Layout (128x64, 8 rows x 16 columns)
  // Row 0: Header
  u8x8.setCursor(0, 0);
  u8x8.print("Emission Tracker");

  // Row 1: PM2.5 and PM10 (most important)
  u8x8.setCursor(0, 1);
  u8x8.printf("PM2.5:%.1f PM10:%.1f", pm25, pm10);

  // Row 2: VOC and eCO2
  u8x8.setCursor(0, 2);
  u8x8.printf("VOC:%d eCO2:%d", voc, eco2);

  // Row 3: Temperature and Humidity
  u8x8.setCursor(0, 3);
  u8x8.printf("T:%.1fC H:%.1f%%", temp, hum);

  // Row 4: Pressure
  u8x8.setCursor(0, 4);
  u8x8.printf("P:%.1fhPa", press);

  // Row 5: Ventilation Status
  u8x8.setCursor(0, 5);
  u8x8.printf("Vent:%s", relay ? "ON " : "OFF");

  // Row 6: Status (Healthy/Unhealthy)
  u8x8.setCursor(0, 6);
  if (voc > 250 || pm25 > 50) {
    u8x8.print("Status:Unhealthy");
  } else {
    u8x8.print("Status:Healthy  ");
  }

  // Row 7: Connection status and message count
  u8x8.setCursor(0, 7);
  u8x8.printf("WS:%s #%d", isConnected ? "OK" : "OFF", messageCount);
}

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
  case WStype_DISCONNECTED: {
    Serial.println("[WS] ✗ Disconnected");
    isConnected = false;
  } break;

  case WStype_CONNECTED: {
    Serial.printf("[WS] ✓ Connected: %s\n", payload);
    isConnected = true;
    messageCount = 0;

    // Send init
    delay(100);
    String initMsg = "{\"type\":\"init\",\"device\":\"ESP32-S3\",\"ip\":\"" +
                     WiFi.localIP().toString() + "\"}";
    webSocket.sendTXT(initMsg);
    Serial.println("[WS] → Init sent");

    updateDisplay(0, 0, 0, 0, 0, 0, 0, false);
  } break;

  case WStype_TEXT: {
    Serial.printf("[WS] ← %s\n", payload);

    // Parse command
    StaticJsonDocument<128> doc;
    if (deserializeJson(doc, payload) == DeserializationError::Ok) {
      const char *cmd = doc["action"];
      if (cmd) {
        if (strcmp(cmd, "FAN_ON") == 0 || strcmp(cmd, "POMPA_ON") == 0) {
          digitalWrite(RELAY_PIN, HIGH);
          Serial.println("[Relay] Manual ON");
        } else if (strcmp(cmd, "FAN_OFF") == 0 ||
                   strcmp(cmd, "POMPA_OFF") == 0) {
          digitalWrite(RELAY_PIN, LOW);
          Serial.println("[Relay] Manual OFF");
        }
      }
    }
  } break;

  case WStype_ERROR: {
    Serial.printf("[WS] ✗ Error: %s\n", payload);
  } break;
  }
}
