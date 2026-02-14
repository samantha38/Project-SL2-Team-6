#include <WiFi.h>
#include <WebSocketsClient.h> 
#include <ArduinoJson.h>
#include <U8x8lib.h>
#include <Wire.h>
#include <Adafruit_SGP30.h>
#include <Adafruit_BME280.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* ws_host = "YOUR_SERVER_IP";
const int ws_port = 3000;

#define RELAY_PIN 43
#define DUST_PIN 44
#define DUST_PM10_PIN 10

#define FORCE_OFFLINE_MODE false
#define OFFLINE_AFTER_SECONDS 0

U8X8_SSD1306_128X64_NONAME_HW_I2C u8x8(U8X8_PIN_NONE);
WebSocketsClient webSocket;
Adafruit_SGP30 sgp;
Adafruit_BME280 bme;

bool isConnected = false;
bool bmeInitialized = false;
bool sgpInitialized = false;
unsigned long lastSendTime = 0;
unsigned long sgpStartTime = 0;
int messageCount = 0;
unsigned long bootTime = 0;

unsigned long dustStartTime = 0;
unsigned long lowpulseoccupancy = 0;
float concentration = 0;

unsigned long dustPM10StartTime = 0;
unsigned long lowpulseoccupancyPM10 = 0;
float concentrationPM10 = 0;

bool useMLPrediction = false;
float ml_pm25 = 0;
float ml_pm10 = 0;

const unsigned long sendInterval = 3000;
const unsigned long dustSampleTime = 30000;

const float TEMP_MIN = 11.0;
const float TEMP_MAX = 47.0;
const float HUM_MIN = 15.0;
const float HUM_MAX = 108.0;
const float PRESS_MIN = 1000.0;
const float PRESS_MAX = 1025.0;
const float PM25_MIN = 1.75;
const float PM25_MAX = 443.0;
const float PM10_MIN = 2.65;
const float PM10_MAX = 659.0;

float predictPM25_ML(float temp, float hum, float press) {
  float temp_norm = (temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);
  float hum_norm = (hum - HUM_MIN) / (HUM_MAX - HUM_MIN);
  float press_norm = (press - PRESS_MIN) / (PRESS_MAX - PRESS_MIN);
  
  float pm25_norm = 0.3 * temp_norm + 0.2 * hum_norm + 0.1 * press_norm +
                    0.15 * temp_norm * hum_norm + 0.25;

  float pm25 = PM25_MIN + pm25_norm * (PM25_MAX - PM25_MIN);

  if (pm25 < 0) pm25 = 0;
  if (pm25 > 500) pm25 = 500;
  
  return pm25;
}

float predictPM10_ML(float temp, float hum, float press) {
  float temp_norm = (temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);
  float hum_norm = (hum - HUM_MIN) / (HUM_MAX - HUM_MIN);
  float press_norm = (press - PRESS_MIN) / (PRESS_MAX - PRESS_MIN);
  
  float pm10_norm = 0.35 * temp_norm + 0.25 * hum_norm + 0.1 * press_norm + 
                    0.2 * temp_norm * hum_norm + 0.1;
  
  float pm10 = PM10_MIN + pm10_norm * (PM10_MAX - PM10_MIN);
  
  if (pm10 < 0) pm10 = 0;
  if (pm10 > 700) pm10 = 700;
  
  return pm10;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  bootTime = millis();
  
  Serial.println("\n========================================");
  Serial.println("ESP32-S3 OFFLINE MODE TEST");
  Serial.println("========================================");
  Serial.printf("FORCE_OFFLINE_MODE: %s\n", FORCE_OFFLINE_MODE ? "YES" : "NO");
  Serial.printf("OFFLINE_AFTER_SECONDS: %d\n", OFFLINE_AFTER_SECONDS);
  Serial.println("========================================\n");

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  pinMode(DUST_PIN, INPUT);
  pinMode(DUST_PM10_PIN, INPUT);

  Wire.begin();
  Wire.setClock(100000);

  Serial.println("[OLED] Initializing...");
  u8x8.begin();
  u8x8.setFlipMode(1);
  u8x8.setFont(u8x8_font_chroma48medium8_r);
  u8x8.clear();
  u8x8.drawString(0, 0, "OFFLINE TEST");
  u8x8.drawString(0, 1, "Starting...");
  Serial.println("[OLED] ✓ OK");

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

  if (FORCE_OFFLINE_MODE) {
    Serial.println("[TEST] ⚠️ FORCE OFFLINE MODE ENABLED - Skipping WiFi");
    useMLPrediction = true;
    u8x8.drawString(0, 5, "TEST: OFFLINE");
    u8x8.drawString(0, 6, "ML Mode: ON");
  } else {
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
      Serial.println("[WiFi] ✗ FAILED - Entering OFFLINE MODE");
      u8x8.drawString(0, 6, "WiFi: FAIL");
      u8x8.drawString(0, 7, "ML Mode: ON");
      useMLPrediction = true;
    } else {
      Serial.println("[WiFi] ✓ Connected");
      Serial.printf("[WiFi] IP: %s\n", WiFi.localIP().toString().c_str());
      u8x8.drawString(0, 6, "WiFi: OK");
      useMLPrediction = false;
    }
    
    delay(500);

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("[WS] Setting up...");
      webSocket.begin(ws_host, ws_port, "/");
      webSocket.onEvent(webSocketEvent);
      webSocket.setReconnectInterval(5000);
      Serial.println("[WS] ✓ Configured");
      u8x8.drawString(0, 7, "WS: OK");
    } else {
      Serial.println("[WS] Skipped - WiFi not connected");
      u8x8.drawString(0, 7, "WS: OFF");
    }
  }
  
  dustStartTime = millis();
  dustPM10StartTime = millis();
  
  Serial.println("\n✓ Initialization complete");
  Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
  if (useMLPrediction) {
    Serial.println("🤖 ML Prediction Mode: ENABLED");
  }
  Serial.println();
}

void loop() {
  if (OFFLINE_AFTER_SECONDS > 0) {
    unsigned long elapsed = (millis() - bootTime) / 1000;
    if (elapsed >= OFFLINE_AFTER_SECONDS && !useMLPrediction && WiFi.status() == WL_CONNECTED) {
      Serial.printf("[TEST] ⚠️ Simulating WiFi disconnect after %d seconds\n", OFFLINE_AFTER_SECONDS);
      WiFi.disconnect();
      delay(100);
      useMLPrediction = true;
      u8x8.drawString(0, 6, "WiFi: TEST");
      u8x8.drawString(0, 7, "ML Mode: ON");
    }
  }

  if (!FORCE_OFFLINE_MODE) {
    if (WiFi.status() != WL_CONNECTED && !useMLPrediction) {
      useMLPrediction = true;
      Serial.println("[WiFi] Connection lost - Switching to ML Mode");
      u8x8.drawString(0, 6, "WiFi: LOST");
      u8x8.drawString(0, 7, "ML Mode: ON");
    } else if (WiFi.status() == WL_CONNECTED && useMLPrediction && !FORCE_OFFLINE_MODE) {
      useMLPrediction = false;
      Serial.println("[WiFi] Connection restored - Switching to Online Mode");
      if (!isConnected) {
        webSocket.begin(ws_host, ws_port, "/");
        webSocket.onEvent(webSocketEvent);
        webSocket.setReconnectInterval(5000);
      }
    }

    if (WiFi.status() == WL_CONNECTED) {
      webSocket.loop();
    }
  }

  // Read PM2.5 dust sensor (non-blocking)
  unsigned long duration = pulseIn(DUST_PIN, LOW, 100000); // 100ms timeout
  if (duration > 0) {
    lowpulseoccupancy += duration;
  }

  // Read PM10 dust sensor (non-blocking)
  unsigned long durationPM10 = pulseIn(DUST_PM10_PIN, LOW, 100000); // 100ms timeout
  if (durationPM10 > 0) {
    lowpulseoccupancyPM10 += durationPM10;
  }

  // Debug output every 5 seconds to check if sensor is reading
  static unsigned long lastDustDebug = 0;
  if (millis() - lastDustDebug > 5000) {
    lastDustDebug = millis();
    Serial.printf("[Dust Debug] PM2.5 Pin:%d LPO:%lu | PM10 Pin:%d LPO:%lu\n", 
                  DUST_PIN, lowpulseoccupancy, DUST_PM10_PIN, lowpulseoccupancyPM10);
    
    // Check if sensor is connected (read pin state)
    int pinStatePM25 = digitalRead(DUST_PIN);
    int pinStatePM10 = digitalRead(DUST_PM10_PIN);
    Serial.printf("[Dust Debug] PM2.5 Pin State: %d | PM10 Pin State: %d\n", pinStatePM25, pinStatePM10);
    
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
      Serial.println("[Dust] ⚠️ PM2.5: No pulses detected - sensor may not be working!");
      Serial.println("[Dust] ⚠️ Check wiring, power supply, and voltage divider!");
      // Keep previous value or set to 0, don't use 0.62 (formula constant)
      if (concentration == 0.62) {
        concentration = 0; // Reset to 0 if it's just the formula constant
      }
    } else {
      concentration = 1.1 * pow(ratio, 3) - 3.8 * pow(ratio, 2) + 520 * ratio + 0.62;
      Serial.printf("[Dust] PM2.5: %.2f (Ratio:%.4f LPO:%lu μs)\n", concentration, ratio, lowpulseoccupancy);
    }
    
    lowpulseoccupancy = 0;
    dustStartTime = millis();
  }

  // Calculate PM10 every 30s
  if ((millis() - dustPM10StartTime) > dustSampleTime) {
    float ratioPM10 = lowpulseoccupancyPM10 / (dustSampleTime * 10.0);
    
    // Check if we have valid data
    if (lowpulseoccupancyPM10 == 0) {
      Serial.println("[Dust] ⚠️ PM10: No pulses detected - sensor may not be working!");
      Serial.println("[Dust] ⚠️ Check wiring, power supply, and voltage divider!");
      // Keep previous value or set to 0, don't use 0.62 (formula constant)
      if (concentrationPM10 == 0.62) {
        concentrationPM10 = 0; // Reset to 0 if it's just the formula constant
      }
    } else {
      concentrationPM10 = 1.1 * pow(ratioPM10, 3) - 3.8 * pow(ratioPM10, 2) + 520 * ratioPM10 + 0.62;
      Serial.printf("[Dust] PM10: %.2f (Ratio:%.4f LPO:%lu μs)\n", concentrationPM10, ratioPM10, lowpulseoccupancyPM10);
    }
    
    lowpulseoccupancyPM10 = 0;
    dustPM10StartTime = millis();
  }

  if ((millis() - lastSendTime > sendInterval)) {
    lastSendTime = millis();
    sendSensorData();
  }
  
  delay(10);
}

void sendSensorData() {
  uint16_t voc = 0, eco2 = 0, h2 = 0, ethanol = 0;
  float temp = 0, hum = 0, press = 0;

  bool sgpReady = sgpInitialized && (millis() - sgpStartTime > 15000);
  if (sgpReady) {
    if (sgp.IAQmeasure()) {
      voc = sgp.TVOC;
      eco2 = sgp.eCO2;
    }
    if (voc > 0 && sgp.IAQmeasureRaw()) {
      h2 = sgp.rawH2;
      ethanol = sgp.rawEthanol;
    }
  }

  if (bmeInitialized) {
    temp = bme.readTemperature();
    hum = bme.readHumidity();
    press = bme.readPressure() / 100.0F;
  }

  if (useMLPrediction && bmeInitialized) {
    ml_pm25 = predictPM25_ML(temp, hum, press);
    ml_pm10 = predictPM10_ML(temp, hum, press);
    Serial.printf("[ML] Predicted: PM2.5=%.1f PM10=%.1f (T=%.1f H=%.1f P=%.1f)\n", 
                  ml_pm25, ml_pm10, temp, hum, press);
  }

  float currentPM25 = useMLPrediction ? ml_pm25 : concentration;
  bool relayState = (voc > 250 || currentPM25 > 50);
  digitalWrite(RELAY_PIN, relayState ? HIGH : LOW);

  StaticJsonDocument<512> doc;
  doc["type"] = "sensor_data";
  doc["device"] = "ESP32-S3";
  doc["voc"] = voc;
  doc["eco2"] = eco2;
  doc["h2"] = h2;
  doc["ethanol"] = ethanol;

  if (useMLPrediction) {
    doc["pm25"] = ml_pm25;
    doc["pm10"] = ml_pm10;
    doc["ml_mode"] = true;
    doc["source"] = "ML_Prediction";
  } else {
    doc["pm25"] = concentration;
    doc["pm10"] = concentrationPM10;
    doc["ml_mode"] = false;
    doc["source"] = "Sensor";
  }
  
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["pressure"] = press;
  doc["status"] = relayState ? "Unhealthy" : "Healthy";
  doc["relay_state"] = relayState ? "ON" : "OFF";
  doc["heap"] = ESP.getFreeHeap();
  doc["wifi_status"] = WiFi.status() == WL_CONNECTED ? "Connected" : "Offline";
  
  String jsonString;
  serializeJson(doc, jsonString);

  if (isConnected && WiFi.status() == WL_CONNECTED && !FORCE_OFFLINE_MODE) {
    bool result = webSocket.sendTXT(jsonString);
    if (result) {
      messageCount++;
      Serial.printf("[WS] → #%d (%d bytes) %s\n", messageCount, jsonString.length(), 
                    useMLPrediction ? "[ML MODE]" : "");
    }
  } else {
    Serial.printf("[OFFLINE] %s\n", jsonString.c_str());
  }

  // Update OLED every 5 messages (more frequent for better visibility)
  if (messageCount % 5 == 0) {
    float currentPM25 = useMLPrediction ? ml_pm25 : concentration;
    float currentPM10 = useMLPrediction ? ml_pm10 : concentrationPM10;
    updateDisplay(voc, eco2, temp, hum, press, currentPM25, currentPM10, relayState, useMLPrediction);
    Serial.printf("[Data] VOC:%d eCO2:%d T:%.1f H:%.1f P:%.1f PM2.5:%.1f PM10:%.1f Relay:%s %s\n", 
                  voc, eco2, temp, hum, press, currentPM25, currentPM10, relayState ? "ON" : "OFF",
                  useMLPrediction ? "[ML]" : "[Sensor]");
  }
}

void updateDisplay(uint16_t voc, uint16_t eco2, float temp, float hum, float press, 
                   float pm25, float pm10, bool relay, bool mlMode) {
  // OLED Display Layout (128x64, 8 rows x 16 columns)
  // Row 0: Header
  u8x8.setCursor(0, 0);
  u8x8.print("Emission Tracker");
  
  // Row 1: PM2.5 and PM10 (most important) - with ML indicator
  u8x8.setCursor(0, 1);
  if (mlMode) {
    u8x8.printf("PM2.5:%.1f* PM10:%.1f*", pm25, pm10);  // * indicates ML prediction
  } else {
    u8x8.printf("PM2.5:%.1f PM10:%.1f", pm25, pm10);
  }
  
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
  
  // Row 7: Connection status, ML mode, and message count
  u8x8.setCursor(0, 7);
  if (mlMode) {
    u8x8.printf("ML:%s #%d", WiFi.status() == WL_CONNECTED ? "OK" : "OFF", messageCount);
  } else {
    u8x8.printf("WS:%s #%d", isConnected ? "OK" : "OFF", messageCount);
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      {
        Serial.println("[WS] ✗ Disconnected");
        isConnected = false;
      }
      break;
      
    case WStype_CONNECTED:
      {
        Serial.printf("[WS] ✓ Connected: %s\n", payload);
        isConnected = true;
        messageCount = 0;
        
        delay(100);
        String initMsg = "{\"type\":\"init\",\"device\":\"ESP32-S3\",\"ip\":\"" + 
                         WiFi.localIP().toString() + "\"}";
        webSocket.sendTXT(initMsg);
        Serial.println("[WS] → Init sent");
        
        updateDisplay(0, 0, 0, 0, 0, 0, 0, false, false);
      }
      break;
      
    case WStype_TEXT:
      {
        Serial.printf("[WS] ← %s\n", payload);
        
        StaticJsonDocument<128> doc;
        if (deserializeJson(doc, payload) == DeserializationError::Ok) {
          const char* cmd = doc["action"];
          if (cmd) {
            if (strcmp(cmd, "FAN_ON") == 0 || strcmp(cmd, "POMPA_ON") == 0) {
              digitalWrite(RELAY_PIN, HIGH);
              Serial.println("[Relay] Manual ON");
            } else if (strcmp(cmd, "FAN_OFF") == 0 || strcmp(cmd, "POMPA_OFF") == 0) {
              digitalWrite(RELAY_PIN, LOW);
              Serial.println("[Relay] Manual OFF");
            }
          }
        }
      }
      break;
      
    case WStype_ERROR:
      {
        Serial.printf("[WS] ✗ Error: %s\n", payload);
      }
      break;
  }
}

