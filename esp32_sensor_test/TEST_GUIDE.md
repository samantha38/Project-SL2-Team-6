# Panduan Test Sensor SGP30 & BMP280

## 🎯 Tujuan Test

Memastikan kedua sensor bekerja dengan baik sebelum diintegrasikan ke sistem utama.

## 📋 Checklist Sebelum Test

- [ ] ESP32 sudah terhubung ke komputer
- [ ] Arduino IDE sudah terinstall dengan ESP32 board support
- [ ] Library sudah terinstall (SGP30, BMP280, Unified Sensor)
- [ ] Wiring sudah benar (cek 2x!)
- [ ] Sensor sudah terhubung ke power (3.3V)

## 🔍 Step-by-Step Test

### Step 1: I2C Scanner (Opsional tapi Recommended)

**Kenapa?** Untuk memastikan sensor terdeteksi di I2C bus.

1. Upload `I2C_SCANNER.ino` ke ESP32
2. Buka Serial Monitor (115200 baud)
3. Lihat output - harus muncul:
   ```
   ✅ I2C device found at address 0x58 -> SGP30
   ✅ I2C device found at address 0x76 -> BMP280
   ```
   atau
   ```
   ✅ I2C device found at address 0x77 -> BMP280
   ```

**Jika tidak muncul:**
- Cek wiring (SDA/SCL)
- Cek power (VCC/GND)
- Coba sensor lain

### Step 2: Sensor Test

1. Upload `esp32_sensor_test.ino` ke ESP32
2. Buka Serial Monitor (115200 baud)
3. Lihat output:

**Output Normal:**
```
========================================
ESP32 Sensor Test - SGP30 & BMP280
========================================

[1] Testing SGP30 (VOC/eCO2 Sensor)...
    ✅ SGP30 initialized successfully!
    Serial ID: 00 00 00

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
```

**Output Error:**
```
[1] Testing SGP30 (VOC/eCO2 Sensor)...
    ❌ SGP30 NOT FOUND!
    Check wiring:
    - VCC -> 3.3V
    - GND -> GND
    - SDA -> GPIO 21
    - SCL -> GPIO 22
```

### Step 3: Verifikasi Data

**SGP30:**
- ✅ TVOC: Berubah-ubah (0-500 ppb normal)
- ✅ eCO2: ~400 ppm (outdoor level) atau lebih tinggi di indoor
- ✅ Nilai tidak stuck di satu angka

**BMP280:**
- ✅ Temperature: Sesuai suhu ruangan (±2°C)
- ✅ Pressure: ~900-1100 hPa (tergantung lokasi)
- ✅ Altitude: Berubah sesuai pressure
- ✅ Nilai tidak stuck

### Step 4: Stress Test (Opsional)

Biarkan sensor running selama 10-15 menit:
- Data harus tetap konsisten
- Tidak ada error di Serial Monitor
- Nilai berubah sesuai kondisi (misal: temperature naik jika ruangan panas)

## ❌ Common Issues & Solutions

### Issue 1: "SGP30 NOT FOUND"

**Kemungkinan:**
- Wiring salah
- Sensor rusak
- I2C address conflict

**Solusi:**
1. Cek wiring dengan multimeter
2. Test dengan I2C scanner
3. Coba sensor lain
4. Cek apakah ada pull-up resistor (biasanya sudah built-in di module)

### Issue 2: "BMP280 NOT FOUND"

**Kemungkinan:**
- Wiring salah
- Address salah (0x76 vs 0x77)
- Sensor rusak

**Solusi:**
1. Script sudah otomatis coba kedua address
2. Cek wiring
3. Test dengan I2C scanner
4. Coba sensor lain

### Issue 3: "Nilai Stuck / Tidak Berubah"

**Kemungkinan:**
- Sensor belum warm-up
- I2C communication error
- Sensor rusak

**Solusi:**
1. Tunggu 15-30 detik (warm-up time)
2. Restart ESP32
3. Cek koneksi I2C
4. Coba sensor lain

### Issue 4: "Nilai Tidak Masuk Akal"

**Contoh:**
- Temperature: -40°C atau 200°C
- Pressure: 0 atau 9999 hPa
- TVOC: 9999 ppb

**Kemungkinan:**
- Sensor rusak
- I2C communication error
- Wiring loose

**Solusi:**
1. Cek wiring (koneksi harus solid)
2. Restart ESP32
3. Coba sensor lain
4. Cek power supply (harus stabil 3.3V)

## ✅ Success Criteria

Test dianggap **BERHASIL** jika:

1. ✅ Kedua sensor terdeteksi (✅ OK di Test Summary)
2. ✅ Data muncul di Serial Monitor
3. ✅ Nilai masuk akal (temperature normal, pressure normal, dll)
4. ✅ Nilai berubah (tidak stuck)
5. ✅ Tidak ada error di Serial Monitor

## 🚀 Next Steps

Setelah test berhasil:

1. **Integrate ke kode utama:**
   - Copy sensor initialization code
   - Copy sensor reading code
   - Test dengan WiFi/WebSocket

2. **Kalibrasi (jika perlu):**
   - SGP30: Tunggu 12 jam untuk baseline
   - BMP280: Set sea level pressure untuk altitude yang akurat

3. **Add sensor lain:**
   - SHT31 untuk humidity (untuk kompensasi SGP30)
   - Sensor lain sesuai kebutuhan

## 📞 Need Help?

Jika masih ada masalah:
1. Cek wiring 2x
2. Test dengan I2C scanner
3. Coba sensor lain
4. Cek Serial Monitor untuk error messages
5. Pastikan library sudah terinstall dengan benar

---

**Good luck! 🍀**



