# 📊 Dataset yang Sudah Di-Download

## ✅ Status Download

### 1. Beijing PM2.5 Dataset (UCI) - ✅ Downloaded
- **File:** `raw/reference/beijing_pm25.csv`
- **Size:** ~1.96 MB
- **Records:** ~43,824
- **Source:** UCI ML Repository
- **Link:** https://archive.ics.uci.edu/ml/datasets/Beijing+PM2.5+Data

**Features:**
- PM2.5 concentration
- Temperature, Pressure, Dew point
- Wind speed/direction
- Hour, day, month, year

**Usage:** Reference dataset untuk comparison dan baseline model

---

### 2. Sample India & Singapore Dataset - ✅ Created
- **File:** `processed/sample_india_singapore_dataset.csv`
- **Size:** ~200 KB
- **Records:** 2,000 (1,000 India + 1,000 Singapore)
- **Source:** Generated based on typical patterns

**Features:**
- timestamp
- temperature (°C)
- humidity (%)
- pressure (hPa)
- pm25 (µg/m³)
- pm10 (µg/m³)
- voc (ppb)
- eco2 (ppm)
- location (India/Singapore)

**Patterns:**
- **India:** Higher pollution (PM2.5: ~45, PM10: ~71)
- **Singapore:** Lower pollution, tropical (PM2.5: ~14, PM10: ~24)

**Usage:** Training dataset untuk model ML offline mode

---

### 3. WAQI Sample Structure - ✅ Created
- **File:** `raw/waqi/sample_structure.json`
- **Purpose:** Template untuk WAQI API data

**Note:** Untuk data real-time, perlu WAQI API token (gratis)
- Link: https://aqicn.org/api/
- Cities: Delhi, Mumbai, Singapore

---

## 📁 Struktur Folder

```
ml_datasets/
├── raw/
│   ├── india/              (untuk dataset India manual)
│   ├── singapore/          (untuk dataset Singapore manual)
│   ├── waqi/               (WAQI API data)
│   │   └── sample_structure.json
│   └── reference/
│       └── beijing_pm25.csv ✅
├── processed/
│   └── sample_india_singapore_dataset.csv ✅
└── download_datasets.py
```

---

## 🚀 Next Steps

### 1. Manual Download (Optional)

#### India Dataset (Mendeley):
- **Link:** https://data.mendeley.com/datasets/ntr7r59p79/1
- **Save to:** `ml_datasets/raw/india/`
- **Features:** AQI data dari berbagai kota India

#### Singapore Dataset (data.gov.sg):
- **Link:** https://data.gov.sg/
- **Search:** "air quality" atau "PSI"
- **Save to:** `ml_datasets/raw/singapore/`

### 2. WAQI API (Real-time)

Untuk data real-time:
1. Dapatkan token gratis di: https://aqicn.org/api/
2. Edit `download_india_singapore.py`
3. Set `WAQI_TOKEN = "your_token"`
4. Run script untuk download real-time data

### 3. Training Model

Dataset siap digunakan untuk training:
- **Reference:** `raw/reference/beijing_pm25.csv`
- **Training:** `processed/sample_india_singapore_dataset.csv`

---

## 📊 Dataset Statistics

### India Pattern (Sample)
- Temperature: 28.1°C (mean), 4.9°C (std)
- Humidity: 61.1% (mean), 15.0% (std)
- PM2.5: 45.5 µg/m³ (mean), 42.7 µg/m³ (std)
- PM10: 71.1 µg/m³ (mean), 63.9 µg/m³ (std)

### Singapore Pattern (Sample)
- Temperature: 28.0°C (mean), 2.1°C (std) - More stable
- Humidity: 80.2% (mean), 10.1% (std) - Higher humidity
- PM2.5: 14.1 µg/m³ (mean), 8.7 µg/m³ (std) - Lower pollution
- PM10: 24.0 µg/m³ (mean), 16.1 µg/m³ (std) - Lower pollution

---

## ✅ Ready to Use!

Dataset sudah siap untuk:
1. ✅ Model training
2. ✅ Data preprocessing
3. ✅ Feature engineering
4. ✅ Model evaluation

Lihat `ML_DATASET_GUIDE.md` untuk detail penggunaan.

