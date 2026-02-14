/*
 * ESP32 Sensor Test - SGP30 & BMP280
 * 
 * Simple test script to verify SGP30 (VOC/eCO2) and BMP280 (Pressure/Temperature) sensors
 * 
 * Wiring:
 * SGP30:
 *   - VCC -> 3.3V
 *   - GND -> GND
 *   - SDA -> GPIO 21 (ESP32 default)
 *   - SCL -> GPIO 22 (ESP32 default)
 * 
 * BMP280:
 *   - VCC -> 3.3V
 *   - GND -> GND
 *   - SDA -> GPIO 21 (ESP32 default)
 *   - SCL -> GPIO 22 (ESP32 default)
 * 
 * Libraries Required:
 *   - Adafruit SGP30 Library
 *   - Adafruit BMP280 Library
 *   - Adafruit Unified Sensor
 *   - Wire (built-in)
 * 
 * Install via Arduino Library Manager:
 *   - Search "Adafruit SGP30"
 *   - Search "Adafruit BMP280"
 *   - Search "Adafruit Unified Sensor"
 */

#include <Wire.h>
#include <Adafruit_SGP30.h>
#include <Adafruit_BMP280.h>

// Sensor objects
Adafruit_SGP30 sgp;
Adafruit_BMP280 bmp;

// SGP30 baseline values (for accurate readings after 12 hours)
uint16_t tvoc_baseline = 0;
uint16_t eco2_baseline = 0;

// Test status
bool sgp30_ok = false;
bool bmp280_ok = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n");
  Serial.println("========================================");
  Serial.println("ESP32 Sensor Test - SGP30 & BMP280");
  Serial.println("========================================\n");
  
  // Initialize I2C
  Wire.begin();
  delay(100);
  
  // Test SGP30
  Serial.println("[1] Testing SGP30 (VOC/eCO2 Sensor)...");
  Serial.println("    Address: 0x58");
  
  if (!sgp.begin()) {
    Serial.println("    ❌ SGP30 NOT FOUND!");
    Serial.println("    Check wiring:");
    Serial.println("    - VCC -> 3.3V");
    Serial.println("    - GND -> GND");
    Serial.println("    - SDA -> GPIO 21");
    Serial.println("    - SCL -> GPIO 22");
    sgp30_ok = false;
  } else {
    Serial.println("    ✅ SGP30 initialized successfully!");
    Serial.print("    Serial ID: ");
    Serial.print(sgp.serialnumber[0], HEX);
    Serial.print(" ");
    Serial.print(sgp.serialnumber[1], HEX);
    Serial.print(" ");
    Serial.println(sgp.serialnumber[2], HEX);
    sgp30_ok = true;
  }
  
  Serial.println();
  
  // Test BMP280
  Serial.println("[2] Testing BMP280 (Pressure/Temperature Sensor)...");
  Serial.println("    Trying address 0x76...");
  
  if (!bmp.begin(0x76)) {
    Serial.println("    Address 0x76 failed. Trying 0x77...");
    if (!bmp.begin(0x77)) {
      Serial.println("    ❌ BMP280 NOT FOUND!");
      Serial.println("    Check wiring:");
      Serial.println("    - VCC -> 3.3V");
      Serial.println("    - GND -> GND");
      Serial.println("    - SDA -> GPIO 21");
      Serial.println("    - SCL -> GPIO 22");
      bmp280_ok = false;
    } else {
      Serial.println("    ✅ BMP280 found at address 0x77!");
      bmp280_ok = true;
    }
  } else {
    Serial.println("    ✅ BMP280 found at address 0x76!");
    bmp280_ok = true;
  }
  
  // Configure BMP280
  if (bmp280_ok) {
    // Set sampling and filter options
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,     // Operating Mode
                    Adafruit_BMP280::SAMPLING_X2,     // Temperature oversampling
                    Adafruit_BMP280::SAMPLING_X16,    // Pressure oversampling
                    Adafruit_BMP280::FILTER_X16,      // Filtering
                    Adafruit_BMP280::STANDBY_MS_500); // Standby time
    Serial.println("    BMP280 configured: Normal mode, 2x temp, 16x pressure");
  }
  
  Serial.println();
  Serial.println("========================================");
  Serial.println("Test Summary:");
  Serial.print("  SGP30:  ");
  Serial.println(sgp30_ok ? "✅ OK" : "❌ FAILED");
  Serial.print("  BMP280: ");
  Serial.println(bmp280_ok ? "✅ OK" : "❌ FAILED");
  Serial.println("========================================\n");
  
  if (!sgp30_ok && !bmp280_ok) {
    Serial.println("⚠️  WARNING: No sensors detected!");
    Serial.println("   Please check your wiring and I2C connections.\n");
  }
  
  Serial.println("Starting continuous readings...\n");
  Serial.println("Time\t\tSGP30 TVOC\tSGP30 eCO2\tBMP280 Temp\tBMP280 Press\tBMP280 Alt");
  Serial.println("(s)\t\t(ppb)\t\t(ppm)\t\t(°C)\t\t(hPa)\t\t(m)");
  Serial.println("--------------------------------------------------------------------------------");
}

void loop() {
  static unsigned long startTime = millis();
  unsigned long elapsed = (millis() - startTime) / 1000;
  
  // Print timestamp
  Serial.print(elapsed);
  Serial.print("\t\t");
  
  // Read SGP30
  if (sgp30_ok) {
    if (!sgp.IAQmeasure()) {
      Serial.print("ERROR\t\tERROR");
    } else {
      Serial.print(sgp.TVOC);
      Serial.print("\t\t");
      Serial.print(sgp.eCO2);
    }
  } else {
    Serial.print("N/A\t\tN/A");
  }
  
  Serial.print("\t\t");
  
  // Read BMP280
  if (bmp280_ok) {
    float temperature = bmp.readTemperature();
    float pressure = bmp.readPressure() / 100.0; // Convert Pa to hPa
    float altitude = bmp.readAltitude(1013.25);  // Sea level pressure
    
    Serial.print(temperature, 2);
    Serial.print("\t\t");
    Serial.print(pressure, 2);
    Serial.print("\t\t");
    Serial.print(altitude, 2);
  } else {
    Serial.print("N/A\t\tN/A\t\tN/A");
  }
  
  Serial.println();
  
  // SGP30 needs humidity compensation for better accuracy
  // (Optional - if you have SHT31 or other humidity sensor)
  // float humidity = ...; // Get from humidity sensor
  // sgp.setHumidity(humidity);
  
  // Every 12 hours, save baseline for SGP30 (for better accuracy)
  static unsigned long lastBaselineSave = 0;
  if (sgp30_ok && (millis() - lastBaselineSave > 12 * 60 * 60 * 1000)) {
    if (!sgp.getIAQBaseline(&eco2_baseline, &tvoc_baseline)) {
      Serial.println("⚠️  Failed to get SGP30 baseline");
    } else {
      Serial.print("💾 SGP30 Baseline saved: eCO2=");
      Serial.print(eco2_baseline);
      Serial.print(", TVOC=");
      Serial.println(tvoc_baseline);
    }
    lastBaselineSave = millis();
  }
  
  delay(2000); // Read every 2 seconds
}



