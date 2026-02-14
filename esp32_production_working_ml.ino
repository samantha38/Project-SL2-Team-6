#include <Adafruit_BME280.h>
#include <Adafruit_SGP30.h>
#include <ArduinoJson.h>
#include <U8x8lib.h>
#include <WebSocketsClient.h>
#include <WiFi.h>
#include <Wire.h>

const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";
const char *ws_host = "YOUR_PC_IP";
const int ws_port = 3000;

const char *GROQ_API_KEY = "YOUR_GROQ_API_KEY_HERE";

#define RELAY_PIN 43
#define DUST_PIN 7
#define DUST_PM10_PIN 10

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

unsigned long dustStartTime = 0;
volatile unsigned long lowpulseoccupancy = 0;
float concentration = 0;
unsigned long lastPM25CalculationTime = 0;

unsigned long dustPM10StartTime = 0;
volatile unsigned long lowpulseoccupancyPM10 = 0;
float concentrationPM10 = 0;
unsigned long lastPM10CalculationTime = 0;
float previousPM10Value = 0;
int pm10StuckCount = 0;

volatile unsigned long pm25_pulseStart = 0;
volatile bool pm25_pulseActive = false;

volatile unsigned long pm10_pulseStart = 0;
volatile bool pm10_pulseActive = false;
volatile unsigned long pm10_interruptCount = 0;
volatile unsigned long pm10_pulseCount = 0;

bool useMLPrediction = false;
float ml_pm25 = 0;
float ml_pm10 = 0;

const unsigned long sendInterval = 3000;
const unsigned long dustSampleTime = 30000;

const float PM10_CALIBRATION_MULTIPLIER = 3.0;
void IRAM_ATTR pm25_interrupt();
void IRAM_ATTR pm10_interrupt();
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length);
void updateDisplay(uint16_t voc, uint16_t eco2, float temp, float hum,
                   float press, float pm25, float pm10, bool relay,
                   bool mlMode);
void sendSensorData();

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

  if (pm25 < 0)
    pm25 = 0;
  if (pm25 > 500)
    pm25 = 500;

  return pm25;
}

float predictPM10_ML(float temp, float hum, float press) {
  float temp_norm = (temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);
  float hum_norm = (hum - HUM_MIN) / (HUM_MAX - HUM_MIN);
  float press_norm = (press - PRESS_MIN) / (PRESS_MAX - PRESS_MIN);

  float pm10_norm = 0.35 * temp_norm + 0.25 * hum_norm + 0.1 * press_norm +
                    0.2 * temp_norm * hum_norm + 0.1;

  float pm10 = PM10_MIN + pm10_norm * (PM10_MAX - PM10_MIN);

  if (pm10 < 0)
    pm10 = 0;
  if (pm10 > 700)
    pm10 = 700;

  return pm10;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println("ESP32-S3 Emission Tracker + ML Mode");
  Serial.println("========================================\n");

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  pinMode(DUST_PIN, INPUT);
  pinMode(DUST_PM10_PIN, INPUT);

  attachInterrupt(digitalPinToInterrupt(DUST_PIN), pm25_interrupt, CHANGE);
  attachInterrupt(digitalPinToInterrupt(DUST_PM10_PIN), pm10_interrupt, CHANGE);

  Serial.println("[Dust Sensor] Using INTERRUPT method");
  Serial.println(
      "[Dust Sensor] Interrupts attached to Pin 7 (PM2.5) and Pin 10 (PM10)");

  Wire.begin();
  Wire.setClock(100000);

  Serial.println("[OLED] Initializing...");
  u8x8.begin();
  u8x8.setFlipMode(1);
  u8x8.setFont(u8x8_font_chroma48medium8_r);
  u8x8.clear();
  u8x8.drawString(0, 0, "Emission Track");
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
  if (WiFi.status() != WL_CONNECTED && !useMLPrediction) {
    useMLPrediction = true;
    Serial.println("[WiFi] Connection lost - Switching to ML Mode");
    u8x8.drawString(0, 6, "WiFi: LOST");
    u8x8.drawString(0, 7, "ML Mode: ON");
  } else if (WiFi.status() == WL_CONNECTED && useMLPrediction) {
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

  static unsigned long lastDustDebug = 0;
  static unsigned long bootTime = 0;
  if (bootTime == 0)
    bootTime = millis();

  if (millis() - lastDustDebug > 5000) {
    lastDustDebug = millis();
    unsigned long uptime = (millis() - bootTime) / 1000;

    Serial.printf("[Dust Debug] PM2.5 Pin:%d LPO:%lu | PM10 Pin:%d LPO:%lu\n",
                  DUST_PIN, lowpulseoccupancy, DUST_PM10_PIN,
                  lowpulseoccupancyPM10);

    int pinStatePM25 = digitalRead(DUST_PIN);
    int pinStatePM10 = digitalRead(DUST_PM10_PIN);
    Serial.printf("[Dust Debug] PM2.5 Pin State: %d | PM10 Pin State: %d | "
                  "Uptime: %lu s\n",
                  pinStatePM25, pinStatePM10, uptime);

    Serial.printf("[Dust Debug] Method: INTERRUPT | LPO accumulated: "
                  "PM2.5=%lu, PM10=%lu μs\n",
                  lowpulseoccupancy, lowpulseoccupancyPM10);

    static unsigned long lastPM10_InterruptCount = 0;
    static unsigned long lastPM10_PulseCount = 0;
    unsigned long interruptDelta =
        pm10_interruptCount - lastPM10_InterruptCount;
    unsigned long pulseDelta = pm10_pulseCount - lastPM10_PulseCount;

    Serial.printf("[Dust Debug] PM10 Interrupt Stats: Total interrupts=%lu "
                  "(+%lu) | Valid pulses=%lu (+%lu)\n",
                  pm10_interruptCount, interruptDelta, pm10_pulseCount,
                  pulseDelta);

    if (interruptDelta == 0) {
      Serial.println("[Dust Debug] WARNING: PM10 INTERRUPT NOT CALLED!");
      Serial.println("[Dust Debug] Check: PM10 pin wiring, interrupt setup, or "
                     "PM10 sensor");
    } else if (pulseDelta == 0 && interruptDelta > 0) {
      Serial.println(
          "[Dust Debug] WARNING: PM10 Interrupt called but no valid pulse!");
      Serial.println(
          "[Dust Debug] Pin state may not change or pulse too short/long");
    }

    lastPM10_InterruptCount = pm10_interruptCount;
    lastPM10_PulseCount = pm10_pulseCount;

    static unsigned long lastLPO_PM10 = 0;
    if (lastLPO_PM10 > 0) {
      if (lowpulseoccupancyPM10 == lastLPO_PM10) {
        Serial.println("[Dust Debug] WARNING: PM10 LPO NOT CHANGING!");
        Serial.println(
            "[Dust Debug] This explains why PM10 is stuck at the same value");
        Serial.println("[Dust Debug] PM10 sensor may not detect new pulses");
      } else {
        Serial.printf(
            "[Dust Debug] OK PM10 LPO CHANGED: %lu -> %lu μs (diff: %ld μs)\n",
            lastLPO_PM10, lowpulseoccupancyPM10,
            (long)(lowpulseoccupancyPM10 - lastLPO_PM10));
      }
    }
    lastLPO_PM10 = lowpulseoccupancyPM10;

    bool sensorHasWorked = (concentration > 0 || concentrationPM10 > 0);

    unsigned long timeElapsedPM25 = millis() - dustStartTime;
    unsigned long timeElapsedPM10 = millis() - dustPM10StartTime;
    unsigned long timeRemainingPM25 =
        (dustSampleTime > timeElapsedPM25)
            ? (dustSampleTime - timeElapsedPM25) / 1000
            : 0;
    unsigned long timeRemainingPM10 =
        (dustSampleTime > timeElapsedPM10)
            ? (dustSampleTime - timeElapsedPM10) / 1000
            : 0;

    if (lowpulseoccupancy == 0 && lowpulseoccupancyPM10 == 0) {
      if (!sensorHasWorked && uptime >= 180) {
        Serial.println("[Dust Debug] WARNING: No pulses detected! Check:");
        Serial.println("  1. Sensor wiring (voltage divider installed?)");
        Serial.println("  2. Sensor power supply (5V connected?)");
        Serial.println("  3. Pin connections (RX7/SWD10 correct?)");
        Serial.println("  4. Sensor preheat: Complete (3 minutes passed)");

        int pinStatePM25 = digitalRead(DUST_PIN);
        int pinStatePM10 = digitalRead(DUST_PM10_PIN);
        if (pinStatePM25 == 1 && pinStatePM10 == 1) {
          Serial.println(
              "[Dust Debug] Pin State: Both HIGH (idle state - normal)");
          Serial.println("[Dust Debug] Using INTERRUPT method - pulses "
                         "captured automatically");
        } else if (pinStatePM25 == 0 || pinStatePM10 == 0) {
          Serial.println("[Dust Debug] WARNING: Pin State: LOW detected (may "
                         "indicate connection issue)");
        }

        Serial.println("");
        Serial.println(
            "===========================================================");
        Serial.println(
            "DIAGNOSIS: Sensor Not Reading Pulse (Interrupt Method)");
        Serial.println(
            "===========================================================");
        Serial.println("Possible Causes:");
        Serial.printf(
            "  1. Sensor not preheated (need 3 minutes) - MOST LIKELY!\n");
        Serial.printf("     -> Uptime: %lu/%d seconds Complete\n", uptime, 180);
        Serial.println("  2. Expansion board may have built-in level shifter");
        Serial.println("     -> Check expansion board documentation");
        Serial.println("  3. Wiring incorrect");
        Serial.println(
            "     -> Check Yellow to RX7, White to SWD10 connections");
        Serial.println("  4. Sensor not receiving 5V power");
        Serial.println("     -> Check Red wire (VCC) to 5V");
        Serial.println("  5. Interrupt not properly attached");
        Serial.println("     -> Check if pin supports interrupt");
        Serial.println("");
        Serial.println("TIP: Using INTERRUPT method (not pulseIn)");
        Serial.println("   Interrupts work in background - more efficient!");
        Serial.println(
            "   If LPO remains 0 after 3 minutes, check wiring and power.");
        Serial.println(
            "===========================================================");
      } else if (sensorHasWorked) {
        Serial.println("[Dust Debug] OK Sensor working! LPO reset after "
                       "calculation (normal)");
        Serial.printf(
            "[Dust Debug] Current values: PM2.5=%.2f μg/m³ | PM10=%.2f μg/m³\n",
            concentration, concentrationPM10);

        if (lastPM25CalculationTime > 0) {
          unsigned long timeSincePM25 =
              (millis() - lastPM25CalculationTime) / 1000;
          Serial.printf("[Dust Debug] PM2.5 last calculated: %lu s ago (will "
                        "update in %lu s)\n",
                        timeSincePM25, timeRemainingPM25);
        }
        if (lastPM10CalculationTime > 0) {
          unsigned long timeSincePM10 =
              (millis() - lastPM10CalculationTime) / 1000;
          Serial.printf("[Dust Debug] PM10 last calculated: %lu s ago (will "
                        "update in %lu s)\n",
                        timeSincePM10, timeRemainingPM10);
        }

        Serial.printf(
            "[Dust Debug] Next calculation in: PM2.5: %lu s | PM10: %lu s\n",
            timeRemainingPM25, timeRemainingPM10);
      } else if (uptime < 180) {
        Serial.printf("[Dust Debug] Sensor preheating: %lu/%d seconds (wait %d "
                      "more seconds)\n",
                      uptime, 180, 180 - uptime);
        Serial.println(
            "[Dust Debug] LPO will accumulate after preheat completes");
      }
    } else {
      Serial.printf("[Dust Debug] OK Interrupts working! LPO accumulating: "
                    "PM2.5=%lu, PM10=%lu μs\n",
                    lowpulseoccupancy, lowpulseoccupancyPM10);

      Serial.printf("[Dust Debug] Sampling progress: PM2.5: %lu/%lu s "
                    "remaining | PM10: %lu/%lu s remaining\n",
                    timeRemainingPM25, dustSampleTime / 1000, timeRemainingPM10,
                    dustSampleTime / 1000);

      if (concentration > 0 || concentrationPM10 > 0) {
        Serial.printf("[Dust Debug] Last calculated: PM2.5=%.2f μg/m³ | "
                      "PM10=%.2f μg/m³\n",
                      concentration, concentrationPM10);
      }

      if (timeElapsedPM25 > 5000 && lowpulseoccupancy > 0) {
        float tempRatio = lowpulseoccupancy / (timeElapsedPM25 * 10.0);
        float tempConcentration = 1.1 * pow(tempRatio, 3) -
                                  3.8 * pow(tempRatio, 2) + 520 * tempRatio +
                                  0.62;
        Serial.printf(
            "[Dust Debug] PM2.5 (estimated): %.2f μg/m³ (from %lu s of data)\n",
            tempConcentration, timeElapsedPM25 / 1000);
      }
      if (timeElapsedPM10 > 5000 && lowpulseoccupancyPM10 > 0) {
        float tempRatioPM10 = lowpulseoccupancyPM10 / (timeElapsedPM10 * 10.0);
        float tempConcentrationPM10 = 1.1 * pow(tempRatioPM10, 3) -
                                      3.8 * pow(tempRatioPM10, 2) +
                                      520 * tempRatioPM10 + 0.62;
        float tempConcentrationPM10Final =
            tempConcentrationPM10 * PM10_CALIBRATION_MULTIPLIER;
        Serial.printf("[Dust Debug] PM10 (estimated): %.2f μg/m³ (raw: %.2f, "
                      "multiplier: %.2f, from %lu s of data)\n",
                      tempConcentrationPM10Final, tempConcentrationPM10,
                      PM10_CALIBRATION_MULTIPLIER, timeElapsedPM10 / 1000);
      }
    }
  }

  if ((millis() - dustStartTime) > dustSampleTime) {
    float ratio = lowpulseoccupancy / (dustSampleTime * 10.0);

    if (lowpulseoccupancy == 0) {
      Serial.println("[Dust] WARNING: PM2.5: No pulses detected - sensor may "
                     "not be working!");
      Serial.println(
          "[Dust] WARNING: Check wiring, power supply, and voltage divider!");
      if (concentration == 0.62) {
        concentration = 0;
      }
    } else {
      concentration =
          1.1 * pow(ratio, 3) - 3.8 * pow(ratio, 2) + 520 * ratio + 0.62;

      if (concentration > 1000.0 || ratio > 5.0) {
        Serial.println(
            "===========================================================");
        Serial.println("WARNING: PM2.5 VALUE TOO HIGH!");
        Serial.println(
            "===========================================================");
        Serial.printf("[Dust] Calculated: %.2f μg/m³ (Ratio: %.6f)\n",
                      concentration, ratio);
        Serial.println("[Dust] This value is UNREALISTIC (>1000 μg/m³)");
        Serial.println("");
        Serial.println("SOLUTION: Lower sensor sensitivity!");
        Serial.println("   1. Find potentiometer on PCB sensor");
        Serial.println("   2. Turn CLOCKWISE (lower sensitivity)");
        Serial.println("   3. Turn little by little (10-20 degrees)");
        Serial.println("   4. Wait 30 seconds, check result");
        Serial.println("   5. Repeat until value < 100 μg/m³");
        Serial.println("");
        Serial.println("Or check if there is dust/smoke source near sensor");
        Serial.println(
            "===========================================================");

        concentration = 1000.0;
        Serial.printf("[Dust] Value capped to: %.2f μg/m³\n", concentration);
      } else if (concentration > 25.0) {
        Serial.println(
            "===========================================================");
        Serial.println("WARNING: PM2.5 VALUE UNHEALTHY!");
        Serial.println(
            "===========================================================");
        Serial.printf("[Dust] Calculated: %.2f μg/m³ (Ratio: %.6f)\n",
                      concentration, ratio);
        Serial.println("[Dust] WHO Standard: < 25 μg/m³ (good)");
        Serial.println("[Dust] This value is UNHEALTHY (> 25 μg/m³)");
        Serial.println("");
        Serial.println("SOLUTION: Lower PM2.5 sensor sensitivity!");
        Serial.println("   1. Find potentiometer on PCB sensor (for PM2.5)");
        Serial.println("   2. Turn CLOCKWISE (lower sensitivity)");
        Serial.println("   3. Turn little by little (10-20 degrees)");
        Serial.println("   4. Wait 30 seconds, check result");
        Serial.println("   5. Repeat until value < 25 μg/m³");
        Serial.println("");
        Serial.println("Or check if there is dust/smoke source near sensor");
        Serial.println(
            "===========================================================");

        lastPM25CalculationTime = millis();
      } else {
        lastPM25CalculationTime = millis();
        Serial.println(
            "===========================================================");
        Serial.printf("[Dust] OK PM2.5 CALCULATED: %.2f μg/m³\n",
                      concentration);
        Serial.printf(
            "[Dust]    Ratio: %.6f | LPO: %lu μs | Sample Time: %lu s\n", ratio,
            lowpulseoccupancy, dustSampleTime / 1000);
        Serial.println(
            "===========================================================");
      }
    }

    lowpulseoccupancy = 0;
    dustStartTime = millis();
  }

  if ((millis() - dustPM10StartTime) > dustSampleTime) {
    unsigned long lpoBeforeReset = lowpulseoccupancyPM10;

    float ratioPM10 = lowpulseoccupancyPM10 / (dustSampleTime * 10.0);

    Serial.println(
        "===========================================================");
    Serial.println("[Dust] PM10 Calculation Started");
    Serial.printf("[Dust]    LPO PM10: %lu μs (in %lu seconds)\n",
                  lpoBeforeReset, dustSampleTime / 1000);
    Serial.printf("[Dust]    Ratio PM10: %.6f\n", ratioPM10);
    Serial.printf("[Dust]    Previous PM10 value: %.2f μg/m³\n",
                  concentrationPM10);
    Serial.println(
        "===========================================================");

    if (lowpulseoccupancyPM10 == 0) {
      Serial.println("[Dust] WARNING: PM10: No pulses detected - sensor may "
                     "not be working!");
      Serial.println(
          "[Dust] WARNING: Check wiring, power supply, and voltage divider!");
      if (concentrationPM10 == 0.62) {
        concentrationPM10 = 0;
      }
    } else {
      concentrationPM10 = 1.1 * pow(ratioPM10, 3) - 3.8 * pow(ratioPM10, 2) +
                          520 * ratioPM10 + 0.62;

      float pm10BeforeMultiplier = concentrationPM10;

      concentrationPM10 = concentrationPM10 * PM10_CALIBRATION_MULTIPLIER;

      Serial.println(
          "===========================================================");
      Serial.println("[Dust] PM10 Calculation Details:");
      Serial.printf("[Dust]    Raw value (before multiplier): %.6f μg/m³\n",
                    pm10BeforeMultiplier);
      Serial.printf("[Dust]    Multiplier: %.2f\n",
                    PM10_CALIBRATION_MULTIPLIER);
      Serial.printf("[Dust]    Final value (after multiplier): %.6f μg/m³\n",
                    concentrationPM10);
      Serial.println(
          "===========================================================");

      bool pm10Stuck = false;
      static unsigned long lastLPO_PM10_ForStuck = 0;

      if (lpoBeforeReset == lastLPO_PM10_ForStuck && lpoBeforeReset > 0) {
        pm10StuckCount++;
        if (pm10StuckCount >= 2) {
          pm10Stuck = true;
        }
      } else {
        pm10StuckCount = 0;
      }

      if (!pm10Stuck && previousPM10Value > 0 &&
          abs(concentrationPM10 - previousPM10Value) < 0.01) {
        pm10StuckCount++;
        if (pm10StuckCount >= 2) {
          pm10Stuck = true;
        }
      }

      bool pm10Unrealistic = (concentrationPM10 > 1000.0 || ratioPM10 > 5.0);

      if ((pm10Stuck || pm10Unrealistic) && concentration > 0) {
        float estimatedPM10 = concentration * 1.5;

        if (pm10Unrealistic) {
          Serial.println(
              "===========================================================");
          Serial.println("WARNING: PM10 VALUE TOO HIGH!");
          Serial.println(
              "===========================================================");
          Serial.printf("[Dust] Calculated: %.2f μg/m³ (Ratio: %.6f)\n",
                        concentrationPM10, ratioPM10);
          Serial.println("[Dust] This value is UNREALISTIC (>1000 μg/m³)");
          Serial.println("[Dust]    Using estimation from PM2.5 instead");
        } else {
          Serial.println(
              "===========================================================");
          Serial.println("[Dust] WARNING: PM10 STUCK DETECTED!");
          Serial.println(
              "[Dust]    PM10 has not changed for several calculations");
          Serial.println("[Dust]    Using estimation from PM2.5");
        }

        Serial.printf("[Dust]    PM2.5: %.2f μg/m³\n", concentration);
        Serial.printf("[Dust]    PM10 (calculated): %.2f μg/m³\n",
                      concentrationPM10);
        Serial.printf("[Dust]    PM10 (estimated): %.2f μg/m³ (PM2.5 × 1.5)\n",
                      estimatedPM10);
        Serial.println(
            "===========================================================");
        concentrationPM10 = estimatedPM10;
        lastPM10CalculationTime = millis();
        previousPM10Value = concentrationPM10;
        lastLPO_PM10_ForStuck = lpoBeforeReset;
      } else {
        lastPM10CalculationTime = millis();
        Serial.println(
            "===========================================================");
        Serial.printf("[Dust] OK PM10 CALCULATED: %.2f μg/m³\n",
                      concentrationPM10);
        Serial.printf(
            "[Dust]    Ratio: %.6f | LPO: %lu μs | Sample Time: %lu s\n",
            ratioPM10, lowpulseoccupancyPM10, dustSampleTime / 1000);
        Serial.printf("[Dust]    Multiplier: %.2f (PM10 already multiplied "
                      "with multiplier)\n",
                      PM10_CALIBRATION_MULTIPLIER);
        Serial.println(
            "===========================================================");
        previousPM10Value = concentrationPM10;
        lastLPO_PM10_ForStuck = lpoBeforeReset;
      }
    }

    lowpulseoccupancyPM10 = 0;
    pm10_interruptCount = 0;
    pm10_pulseCount = 0;
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
    Serial.printf(
        "[ML] Predicted: PM2.5=%.1f PM10=%.1f (T=%.1f H=%.1f P=%.1f)\n",
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

  if (isConnected && WiFi.status() == WL_CONNECTED) {
    bool result = webSocket.sendTXT(jsonString);
    if (result) {
      messageCount++;
      Serial.printf("[WS] → #%d (%d bytes) %s\n", messageCount,
                    jsonString.length(), useMLPrediction ? "[ML MODE]" : "");
    }
  } else {
    Serial.printf("[OFFLINE] %s\n", jsonString.c_str());
  }

  if (messageCount % 5 == 0) {
    float currentPM25 = useMLPrediction ? ml_pm25 : concentration;
    float currentPM10 = useMLPrediction ? ml_pm10 : concentrationPM10;
    updateDisplay(voc, eco2, temp, hum, press, currentPM25, currentPM10,
                  relayState, useMLPrediction);
    Serial.printf("[Data] VOC:%d eCO2:%d T:%.1f H:%.1f P:%.1f PM2.5:%.1f "
                  "PM10:%.1f Relay:%s %s\n",
                  voc, eco2, temp, hum, press, currentPM25, currentPM10,
                  relayState ? "ON" : "OFF",
                  useMLPrediction ? "[ML]" : "[Sensor]");
  }
}

void updateDisplay(uint16_t voc, uint16_t eco2, float temp, float hum,
                   float press, float pm25, float pm10, bool relay,
                   bool mlMode) {
  u8x8.clear();

  u8x8.setCursor(0, 0);
  u8x8.print("Air Quality");

  u8x8.setCursor(0, 1);
  if (mlMode) {
    u8x8.printf("PM2.5:%.2f*", pm25);
  } else {
    u8x8.printf("PM2.5:%.2f", pm25);
  }

  u8x8.setCursor(0, 2);
  if (mlMode) {
    u8x8.printf("PM10:%.2f*", pm10);
  } else {
    u8x8.printf("PM10:%.2f", pm10);
  }

  u8x8.setCursor(0, 3);
  u8x8.printf("VOC:%d eCO2:%d", voc, eco2);

  u8x8.setCursor(0, 4);
  u8x8.printf("T:%.1fC H:%.1f%%", temp, hum);

  u8x8.setCursor(0, 5);
  u8x8.printf("P:%.1fhPa", press);

  u8x8.setCursor(0, 6);
  if (voc > 250 || pm25 > 50) {
    u8x8.printf("Bad Vent:%s", relay ? "ON" : "OFF");
  } else {
    u8x8.printf("Good Vent:%s", relay ? "ON" : "OFF");
  }

  u8x8.setCursor(0, 7);
  if (mlMode) {
    u8x8.printf("ML:%s", WiFi.status() == WL_CONNECTED ? "OK" : "OFF");
  } else {
    u8x8.printf("WS:%s", isConnected ? "OK" : "OFF");
  }
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

    delay(100);
    String initMsg = "{\"type\":\"init\",\"device\":\"ESP32-S3\",\"ip\":\"" +
                     WiFi.localIP().toString() + "\"}";
    webSocket.sendTXT(initMsg);
    Serial.println("[WS] → Init sent");

    updateDisplay(0, 0, 0, 0, 0, 0, 0, false, false);
  } break;

  case WStype_TEXT: {
    Serial.printf("[WS] ← %s\n", payload);

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

void IRAM_ATTR pm25_interrupt() {
  unsigned long currentTime = micros();

  if (digitalRead(DUST_PIN) == LOW) {
    pm25_pulseStart = currentTime;
    pm25_pulseActive = true;
  } else if (pm25_pulseActive) {
    unsigned long pulseDuration = currentTime - pm25_pulseStart;
    if (pulseDuration > 0 && pulseDuration < 1000000) {
      lowpulseoccupancy += pulseDuration;
    }
    pm25_pulseActive = false;
  }
}

void IRAM_ATTR pm10_interrupt() {
  pm10_interruptCount++;
  unsigned long currentTime = micros();

  if (digitalRead(DUST_PM10_PIN) == LOW) {
    pm10_pulseStart = currentTime;
    pm10_pulseActive = true;
  } else if (pm10_pulseActive) {
    unsigned long pulseDuration = currentTime - pm10_pulseStart;
    if (pulseDuration > 0 && pulseDuration < 1000000) {
      lowpulseoccupancyPM10 += pulseDuration;
      pm10_pulseCount++;
    }
    pm10_pulseActive = false;
  }
}
