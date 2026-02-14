# ESP32 Sensor Test - SGP30 & BMP280

Skrip test sederhana untuk memverifikasi sensor SGP30 dan BMP280 bekerja dengan baik.

## 📋 Persyaratan

### Hardware:
- ESP32 (ESP32-S3, ESP32-WROOM, atau ESP32-WROVER)
- SGP30 Sensor (VOC/eCO2)
- BMP280 Sensor (Pressure/Temperature)
- Kabel jumper
- Breadboard (opsional)

### Software:
- Arduino IDE dengan ESP32 board support
- Library berikut (install via Library Manager):
  - **Adafruit SGP30** (by Adafruit)
  - **Adafruit BMP280** (by Adafruit)
  - **Adafruit Unified Sensor** (by Adafruit) - dependency

## 🔌 Wiring (Koneksi)

### SGP30:
```
SGP30    ->    ESP32
-------------------
VCC      ->    3.3V
GND      ->    GND
SDA      ->    GPIO 21
SCL      ->    GPIO 22
```

### BMP280:
```
BMP280   ->    ESP32
-------------------
VCC      ->    3.3V
GND      ->    GND
SDA      ->    GPIO 21
SCL      ->    GPIO 22
```

**Catatan:** Kedua sensor menggunakan I2C yang sama (SDA/SCL), jadi bisa dihubungkan ke bus I2C yang sama.

## 📦 Install Library

### Via Arduino IDE:
1. Buka **Tools → Manage Libraries**
2. Cari dan install:
   - `Adafruit SGP30`
   - `Adafruit BMP280`
   - `Adafruit Unified Sensor` (akan terinstall otomatis sebagai dependency)

### Via PlatformIO:
Tambahkan ke `platformio.ini`:
```ini
lib_deps = 
    adafruit/Adafruit SGP30@^2.2.3
    adafruit/Adafruit BMP280 Library@^2.6.6
    adafruit/Adafruit Unified Sensor@^1.1.9
```

## 🚀 Cara Menggunakan

1. **Buka file** `esp32_sensor_test.ino` di Arduino IDE

2. **Pilih Board:**
   - Tools → Board → ESP32 Arduino → Pilih board Anda (ESP32 Dev Module, ESP32-S3, dll)

3. **Pilih Port:**
   - Tools → Port → COMx (Windows) atau /dev/ttyUSBx (Linux/Mac)

4. **Upload** kode ke ESP32

5. **Buka Serial Monitor:**
   - Tools → Serial Monitor
   - Set baud rate ke **115200**

6. **Lihat output:**
   ```
   ========================================
   ESP32 Sensor Test - SGP30 & BMP280
   ========================================

   [1] Testing SGP30 (VOC/eCO2 Sensor)...
       ✅ SGP30 initialized successfully!
       Serial ID: XX XX XX

   [2] Testing BMP280 (Pressure/Temperature Sensor)...
       ✅ BMP280 found at address 0x76!

   ========================================
   Test Summary:
     SGP30:  ✅ OK
     BMP280: ✅ OK
   ========================================

   Starting continuous readings...

   Time    SGP30 TVOC  SGP30 eCO2  BMP280 Temp  BMP280 Press  BMP280 Alt
   (s)     (ppb)       (ppm)       (°C)         (hPa)         (m)
   --------------------------------------------------------------------------------
   0       0           400         27.45        938.76        639.46
   2       2           400         27.46        938.77        639.45
   4       0           400         27.47        938.75        639.47
   ...
   ```

## ✅ Hasil Test yang Normal

### SGP30:
- **TVOC**: 0-500 ppb (normal indoor: 0-200 ppb)
- **eCO2**: 400-1000 ppm (normal indoor: 400-1000 ppm)
- **Serial ID**: Akan muncul 3 angka hex (contoh: `0x00 0x00 0x00`)

### BMP280:
- **Temperature**: Sesuai suhu ruangan (biasanya 20-30°C)
- **Pressure**: ~1000 hPa (tergantung lokasi dan ketinggian)
- **Altitude**: Akan dihitung dari pressure (biasanya 0-1000m)

## ❌ Troubleshooting

### SGP30 NOT FOUND
**Kemungkinan masalah:**
1. Wiring salah (cek VCC, GND, SDA, SCL)
2. Sensor rusak
3. I2C address conflict (jarang terjadi)

**Solusi:**
- Cek wiring dengan multimeter
- Coba sensor lain
- Scan I2C address dengan I2C scanner

### BMP280 NOT FOUND
**Kemungkinan masalah:**
1. Wiring salah
2. Sensor menggunakan address 0x77 (bukan 0x76)
3. Sensor rusak

**Solusi:**
- Script akan otomatis coba kedua address (0x76 dan 0x77)
- Cek wiring
- Coba sensor lain

### Nilai Tidak Berubah / Stuck
**Kemungkinan masalah:**
1. Sensor belum warm-up (butuh beberapa detik)
2. Sensor rusak
3. I2C communication error

**Solusi:**
- Tunggu 10-30 detik untuk warm-up
- Restart ESP32
- Cek koneksi I2C

### I2C Scanner (Jika Perlu)

Jika sensor tidak terdeteksi, gunakan I2C scanner untuk cek address:

```cpp
#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(115200);
  Serial.println("\nI2C Scanner");
}

void loop() {
  byte error, address;
  int nDevices = 0;
  
  Serial.println("Scanning...");
  
  for(address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("I2C device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      Serial.println(" !");
      nDevices++;
    }
  }
  
  if (nDevices == 0) {
    Serial.println("No I2C devices found\n");
  } else {
    Serial.println("done\n");
  }
  
  delay(5000);
}
```

## 📊 Interpretasi Data

### SGP30 TVOC (Total Volatile Organic Compounds)
- **0-65 ppb**: Excellent
- **65-220 ppb**: Good
- **220-660 ppb**: Moderate
- **>660 ppb**: Poor

### SGP30 eCO2 (Equivalent CO2)
- **400-600 ppm**: Excellent (outdoor level)
- **600-1000 ppm**: Good
- **1000-2000 ppm**: Moderate (ventilasi diperlukan)
- **>2000 ppm**: Poor (ventilasi urgent)

### BMP280 Temperature
- Normal range: -40°C to +85°C
- Accuracy: ±1°C

### BMP280 Pressure
- Normal sea level: ~1013.25 hPa
- Berubah sesuai cuaca dan ketinggian

## 🔧 Advanced: Baseline SGP30

SGP30 membutuhkan **baseline** untuk akurasi lebih baik. Baseline akan otomatis disimpan setelah 12 jam operasi.

Untuk set baseline manual (jika sudah punya):
```cpp
sgp.setIAQBaseline(eco2_baseline, tvoc_baseline);
```

## 📝 Catatan

- SGP30 butuh **warm-up time** ~15 detik setelah power-on
- SGP30 butuh **12 jam** untuk baseline yang akurat
- BMP280 lebih cepat stabil (beberapa detik)
- Kedua sensor menggunakan I2C, jadi bisa dihubungkan ke bus yang sama

## 🎯 Next Steps

Setelah test berhasil:
1. Integrate ke kode utama ESP32
2. Tambahkan WiFi/WebSocket untuk kirim data ke server
3. Tambahkan sensor lain (SHT31 untuk humidity, dll)

---

**Happy Testing! 🚀**



