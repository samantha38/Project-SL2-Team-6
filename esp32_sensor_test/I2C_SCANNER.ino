/*
 * I2C Scanner untuk ESP32
 * 
 * Script ini akan scan semua I2C address yang terhubung
 * Berguna untuk troubleshooting jika sensor tidak terdeteksi
 * 
 * Wiring: SDA -> GPIO 21, SCL -> GPIO 22 (ESP32 default)
 */

#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n");
  Serial.println("========================================");
  Serial.println("I2C Scanner - ESP32");
  Serial.println("========================================\n");
  Serial.println("Scanning I2C bus...\n");
}

void loop() {
  byte error, address;
  int nDevices = 0;
  
  Serial.println("Scanning I2C addresses from 0x08 to 0x77...\n");
  
  for(address = 8; address < 120; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("✅ I2C device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      
      // Identify common sensors
      if (address == 0x58) {
        Serial.print(" -> SGP30 (VOC/eCO2)");
      } else if (address == 0x76) {
        Serial.print(" -> BMP280 (Pressure/Temp) - Address 0x76");
      } else if (address == 0x77) {
        Serial.print(" -> BMP280 (Pressure/Temp) - Address 0x77");
      } else if (address == 0x44) {
        Serial.print(" -> SHT31 (Temperature/Humidity)");
      } else if (address == 0x45) {
        Serial.print(" -> SHT31 (Temperature/Humidity) - Alt Address");
      }
      
      Serial.println();
      nDevices++;
    } else if (error == 4) {
      Serial.print("❌ Unknown error at address 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
    }
  }
  
  Serial.println();
  if (nDevices == 0) {
    Serial.println("❌ No I2C devices found!");
    Serial.println("\nTroubleshooting:");
    Serial.println("1. Check wiring: SDA -> GPIO 21, SCL -> GPIO 22");
    Serial.println("2. Check power: VCC -> 3.3V, GND -> GND");
    Serial.println("3. Check pull-up resistors (some modules have built-in)");
    Serial.println("4. Try different I2C pins if needed");
  } else {
    Serial.print("✅ Found ");
    Serial.print(nDevices);
    Serial.println(" device(s)\n");
  }
  
  Serial.println("========================================\n");
  delay(5000); // Scan every 5 seconds
}



