# ESP32-S3 Emission Tracker - Industrial Air Quality Monitoring System

## 📋 Overview

**ESP32-S3 Emission Tracker** is an IoT-based air quality monitoring system designed for industrial environments. The system combines real-time sensor data collection, machine learning-powered predictions, and AI-driven analysis to provide comprehensive environmental monitoring with seamless offline capabilities.

### ✨ Key Features

- 🔄 **Hybrid Online/Offline Mode** - ML predictions when WiFi is unavailable
- 🤖 **AI-Powered Analysis** - Analysis using Groq Llama 3.3 every 5 minutes
- 📊 **Real-time Dashboard** - Next.js dashboard with live visualization
- 🎯 **Automatic Control** - Automatic ventilation control based on air quality
- 📡 **7 Sensor Integration** - VOC, eCO2, PM2.5, PM10, Temperature, Humidity, Pressure
- 🔌 **WebSocket Communication** - Stable real-time communication

---

## 🤖 AI Models & Datasets Used

### AI Models

1. **Groq Llama 3.3 70B Versatile** (AI Analysis)
   - **Location**: `server-integrated.js` (line 282)
   - **Provider**: Groq API (https://groq.com/)
   - **Model Card**: https://groq.com/models/llama-3-3-70b-versatile/
   - **Usage**: Industrial air quality analysis every 5 minutes
   - **API Key**: Set via `.env` file (`GROQ_API_KEY`)

2. **TensorFlow/Keras Neural Network** (PM Prediction)
   - **Location**: `ml_datasets/models/`
   - **Files**: 
     - `pm_predictor.h5` (Keras model)
     - `pm_predictor.tflite` (TensorFlow Lite)
     - `pm_predictor_quantized.tflite` (Quantized for ESP32)
   - **Input**: Temperature, Humidity, Pressure
   - **Output**: PM2.5, PM10 predictions
   - **Training Script**: `ml_datasets/train_model.py`

### Datasets

1. **Beijing PM2.5 Dataset** (Reference)
   - **Location**: `ml_datasets/raw/reference/beijing_pm25.csv`
   - **Source**: UCI ML Repository
   - **Link**: https://archive.ics.uci.edu/ml/datasets/Beijing+PM2.5+Data
   - **Size**: ~1.96 MB, 43,824 records

2. **Sample India & Singapore Dataset** (Training)
   - **Location**: `ml_datasets/processed/sample_india_singapore_dataset.csv`
   - **Size**: ~200 KB, 2,000 records
   - **Source**: Generated based on typical patterns from India and Singapore air quality data

3. **External Dataset Sources** (Optional)
   - **WAQI API**: https://aqicn.org/api/ (India & Singapore real-time data)
   - **India CPCB**: https://cpcb.nic.in/ (India air quality data)
   - **Singapore NEA**: https://www.nea.gov.sg/ (Singapore air quality data)
   - **Download Scripts**: `ml_datasets/download_datasets.py`, `ml_datasets/download_india_singapore.py`

### Scripts

- **`ml_datasets/train_model.py`** - Train ML model
- **`ml_datasets/convert_to_tflite.py`** - Convert to TensorFlow Lite
- **`ml_datasets/download_datasets.py`** - Download datasets
- **`ml_datasets/download_india_singapore.py`** - Download from WAQI API

**All models, datasets, and scripts are included in this repository.**

---

## 🏗️ System Architecture

```
┌─────────────────┐
│   ESP32-S3      │  ← 7 Sensors + ML Predictions
│   (Hardware)    │
└────────┬────────┘
         │ WiFi/WebSocket
         ↓
┌─────────────────┐
│  Node.js Server │  ← WebSocket + Groq AI
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Next.js Dashboard│  ← Real-time Visualization
└─────────────────┘
```

### Hardware Components

- **Microcontroller**: ESP32-S3 (Dual-core, WiFi)
- **Sensors**:
  - SGP30 (VOC/eCO2)
  - BME280 (Temperature/Humidity/Pressure)
  - DSM501A/Grove Dust Sensor (PM2.5/PM10)
  - OLED Display (SSD1306)
  - Relay Module (Ventilation Control)

### Software Stack

- **ESP32**: Arduino C++ (~768 lines)
- **Backend**: Node.js + Express + WebSocket (~450 lines)
- **Frontend**: Next.js 14 + TypeScript + React (~500 lines)
- **ML**: Python (TensorFlow/Keras) (~300 lines)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Arduino IDE with ESP32 board support
- Python 3.8+ (for ML training, optional)

### Installation

#### 1. Clone Repository

```bash
git clone <repository-url>
cd "Project SL2 Team 6"
```

#### 2. Install Backend Dependencies

```bash
npm install
```

#### 3. Install Frontend Dependencies

```bash
cd nextjs-dashboard
npm install
cd ..
```

#### 4. Setup Environment Variables

Create `.env` file in root directory:

```env
GROQ_API_KEY=your_groq_api_key_here
```

---

## 🔧 Hardware Setup

### Sensor Wiring

#### SGP30 (VOC/eCO2 Sensor)
```
SGP30    ->    ESP32-S3
-------------------
VCC      ->    3.3V
GND      ->    GND
SDA      ->    GPIO 21
SCL      ->    GPIO 22
```

#### BME280 (Temperature/Humidity/Pressure)
```
BME280   ->    ESP32-S3
-------------------
VCC      ->    3.3V
GND      ->    GND
SDA      ->    GPIO 21
SCL      ->    GPIO 22
```

**Note**: SGP30 and BME280 use the same I2C bus (SDA/SCL), can be connected to the same I2C bus.

#### DSM501A/Grove Dust Sensor (PM2.5/PM10)

**⚠️ IMPORTANT: Voltage Divider Required!**

```
DSM501A Sensor          Voltage Divider          ESP32-S3
┌─────────────┐         ┌──────────────┐        ┌─────────┐
│   VCC (5V)  │─────────│  5V Power    │        │         │
│   GND       │─────────│  GND         │────────│  GND    │
│   Pin 1     │─────────│  10kΩ        │        │         │
│  (Output)   │         │     │        │        │         │
│             │         │     ├─────────┼────────│  GPIO7  │
│             │         │     │        │        │ (PM2.5)  │
│             │         │  20kΩ       │        │         │
│             │         │     │        │        │         │
│             │         │     └────────┼────────│  GND    │
└─────────────┘         └──────────────┘        └─────────┘
```

**Voltage Divider Circuit:**
```
Sensor Output (5V) → [10kΩ] → ESP32 Pin → [20kΩ] → GND
Result: 5V / 3 = ~1.67V (safe for ESP32 3.3V input)
```

**Pin Configuration:**
- PM2.5: GPIO 7 (DUST_PIN)
- PM10: GPIO 10 (DUST_PM10_PIN)
- Relay: GPIO 43 (RELAY_PIN)

#### OLED Display (SSD1306)
```
OLED    ->    ESP32-S3
-------------------
VCC     ->    3.3V
GND     ->    GND
SDA     ->    GPIO 21
SCL     ->    GPIO 22
```

### Required Libraries (Arduino IDE)

Install via Library Manager:
- **Adafruit SGP30** (by Adafruit)
- **Adafruit BME280** (by Adafruit)
- **Adafruit Unified Sensor** (by Adafruit) - dependency
- **ArduinoJson** (by Benoit Blanchon)
- **WebSockets** (by Markus Sattler)
- **U8g2** or **U8x8lib** (by olikraus) - for OLED

---

## 💻 Software Configuration

### ESP32 Configuration

1. **Open file**: `esp32_production_working_ml.ino` in Arduino IDE

2. **Update WiFi Credentials**:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

3. **Update WebSocket Server IP**:
```cpp
const char* ws_host = "YOUR_PC_IP_ADDRESS";  // IP of computer running the server
const int ws_port = 3000;
```

4. **Select Board**: 
   - Tools → Board → ESP32 Arduino → ESP32-S3 Dev Module

5. **Upload to ESP32**

### Server Configuration

Server will run on:
- **WebSocket Server**: Port 3000
- **Next.js Dashboard**: Port 3001
- **HTTP API**: Port 3000

---

## 🚀 Running the System

### Option 1: Integrated Server (Recommended)

Run the integrated server that will start WebSocket and Next.js dashboard:

```bash
npm run dev
```

This will:
1. Kill port 3000 (if any process is using it)
2. Start WebSocket Server on port 3000
3. Start Next.js Dashboard on port 3001
4. Auto-redirect from port 3000 to 3001

### Option 2: Manual Start (2 Terminals)

#### Terminal 1 - WebSocket Server:
```bash
node server-integrated.js
```

#### Terminal 2 - Next.js Dashboard:
```bash
cd nextjs-dashboard
npm run dev
```

### Access Points

- **Main Dashboard**: http://localhost:3001
- **Auto Redirect**: http://localhost:3000 (redirects to 3001)
- **WebSocket**: ws://localhost:3000 (ESP32 connects here)
- **API Status**: http://localhost:3000/api/status

---

## 📊 Sensor Data Format

### WebSocket Message Format

```json
{
  "type": "sensor_data",
  "device": "ESP32-S3",
  "voc": 120,
  "eco2": 400,
  "pm25": 25.5,
  "pm10": 35.2,
  "temperature": 27.45,
  "humidity": 65.2,
  "pressure": 1013.25,
  "altitude": 639.46,
  "ml_mode": false,
  "source": "Sensor",
  "wifi_status": "Connected",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Sensor Ranges

| Sensor | Range | Unit | Normal Values |
|--------|-------|------|---------------|
| VOC | 0-60,000 | ppb | 0-200 (indoor) |
| eCO2 | 400-60,000 | ppm | 400-1000 (indoor) |
| PM2.5 | 1.75-443 | µg/m³ | <50 (good) |
| PM10 | 2.65-659 | µg/m³ | <50 (good) |
| Temperature | 11-47 | °C | 20-30 (indoor) |
| Humidity | 15-108 | % RH | 40-60 (comfortable) |
| Pressure | 1000-1025 | hPa | ~1013 (sea level) |

---

## 🤖 AI Models & Machine Learning

### AI Model for Analysis (Groq)

**Model**: Llama 3.3 70B Versatile
- **Provider**: Groq API
- **Usage**: AI-powered analysis every 5 minutes
- **Location**: `server-integrated.js` (line 282)
- **API Key**: Set via `.env` file (`GROQ_API_KEY`)
- **Documentation**: https://groq.com/
- **Model Card**: https://groq.com/models/llama-3-3-70b-versatile/

**Implementation:**
```javascript
const chatCompletion = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [...],
  max_tokens: 200,
  temperature: 0.6
});
```

### ML Models for PM Prediction (Offline Mode)

**Location**: `ml_datasets/models/`

**Available Models:**
1. **Keras Model** (`pm_predictor.h5`)
   - Format: H5 (Keras)
   - Size: ~1-2 KB
   - Framework: TensorFlow/Keras

2. **TensorFlow Lite** (`pm_predictor.tflite`)
   - Format: TFLite
   - Size: ~5-10 KB
   - Optimized for edge devices

3. **Quantized TFLite** (`pm_predictor_quantized.tflite`)
   - Format: Quantized TFLite (INT8)
   - Size: ~2-5 KB
   - Best for ESP32 deployment

**Model Architecture:**
```
Input (3) → Dense(16) → Dropout(0.2) → Dense(8) → Dense(4) → Output(2)
```

**Model Performance** (from `model_info.json`):
- **MSE PM2.5**: 797.94
- **MSE PM10**: 1864.62
- **MAE PM2.5**: 18.11 µg/m³
- **MAE PM10**: 29.00 µg/m³
- **R² PM2.5**: 0.12
- **R² PM10**: 0.11

**Model Files:**
- `ml_datasets/models/pm_predictor.h5` - Keras model
- `ml_datasets/models/pm_predictor.tflite` - TensorFlow Lite
- `ml_datasets/models/pm_predictor_quantized.tflite` - Quantized version
- `ml_datasets/models/scaler_X.pkl` - Input feature scaler
- `ml_datasets/models/scaler_y.pkl` - Output target scaler
- `ml_datasets/models/model_info.json` - Model metadata

**Current ESP32 Implementation**: Simple Polynomial Approximation (lightweight, no TensorFlow Lite needed)

**Features:**
- ✅ No TensorFlow Lite library needed
- ✅ Very lightweight (< 1KB code)
- ✅ Fast (microseconds)
- ✅ Easy to debug

**Model Input:**
- Temperature (°C)
- Humidity (%)
- Pressure (hPa)

**Model Output:**
- PM2.5 (µg/m³)
- PM10 (µg/m³)

### ML Mode Detection

ESP32 automatically switches to ML mode when:
- WiFi connection lost
- WebSocket disconnected
- Network timeout

### Training ML Model

**Scripts Location**: `ml_datasets/`

**Training Scripts:**
1. **`train_model.py`** - Train neural network model
   - Loads dataset from `processed/sample_india_singapore_dataset.csv`
   - Builds and trains Keras model
   - Saves model to `models/pm_predictor.h5`
   - Saves scalers to `models/scaler_X.pkl` and `models/scaler_y.pkl`
   - Evaluates model performance

2. **`convert_to_tflite.py`** - Convert Keras to TensorFlow Lite
   - Converts `pm_predictor.h5` to TFLite format
   - Creates quantized version for ESP32
   - Saves to `models/pm_predictor.tflite` and `models/pm_predictor_quantized.tflite`

3. **`download_datasets.py`** - Download datasets from various sources
   - Downloads Beijing PM2.5 dataset (UCI)
   - Downloads India/Singapore data (if API keys available)

4. **`download_india_singapore.py`** - Download from WAQI API
   - Requires WAQI API token (free from https://aqicn.org/api/)
   - Downloads real-time air quality data

**How to Train:**

```bash
cd ml_datasets
pip install -r requirements.txt

# Step 1: Download datasets (optional, sample dataset already included)
python download_datasets.py

# Step 2: Train model
python train_model.py

# Step 3: Convert to TFLite
python convert_to_tflite.py
```

**Dependencies** (`ml_datasets/requirements.txt`):
- pandas>=2.0.0
- numpy>=1.24.0
- scikit-learn>=1.3.0
- tensorflow>=2.13.0
- requests>=2.31.0

---

## 🎨 Dashboard Features

### Real-time Sensor Cards
- VOC (Volatile Organic Compounds)
- PM2.5 (Particulate Matter 2.5)
- PM10 (Particulate Matter 10)
- Temperature
- Humidity
- Pressure
- Altitude

### Interactive Charts
- PM2.5 trends over time
- VOC levels
- Temperature variations
- ML Mode indicator

### Device Information
- Device name
- WiFi signal strength (RSSI)
- Connection status
- ML Mode status
- Data source (Sensor/ML Prediction)

### AI Analysis
- AI-powered insights every 5 minutes
- Professional analysis for industrial environments
- Recommendations for factory operations

---

## 🔧 Troubleshooting

### Problem 1: Port 3000 already in use

**Solution:**
```bash
npm run kill-port
# or
.\kill-port.ps1
```

### Problem 2: ESP32 not connecting to server

**Check:**
1. ESP32 sending to port 3000
2. Server running on port 3000
3. Firewall not blocking port 3000
4. IP address in ESP32 code matches server computer IP
5. WiFi credentials are correct

### Problem 3: PM2.5/PM10 always 0.62

**Possible issues:**
- Sensor not detecting pulses
- Voltage divider not installed
- Sensor not preheated (wait 3 minutes)
- Wiring incorrect

**Solution:**
1. Check voltage divider circuit (10kΩ + 20kΩ)
2. Ensure sensor has preheated for 3 minutes
3. Check GPIO pin connections
4. Check Serial Monitor for debug output

### Problem 4: Dashboard not updating

**Solution:**
1. Hard refresh browser: `Ctrl+Shift+R`
2. Check browser console (F12) for errors
3. Check server console for broadcast messages
4. Ensure WebSocket connection status is green

### Problem 5: Next.js not starting

**Solution:**
```bash
cd nextjs-dashboard
rm -rf node_modules .next
npm install
cd ..
npm run dev
```

### Problem 6: Sensor not detected

**For SGP30/BME280:**
1. Check I2C wiring (SDA/SCL)
2. Scan I2C address with I2C scanner
3. Ensure libraries are installed

**For Dust Sensor:**
1. Check voltage divider
2. Ensure sensor has preheated for 3 minutes
3. Check GPIO pin in code

---

## 📝 Project Structure

```
Project SL2 Team 6/
├── esp32_production_working_ml.ino    # ESP32 code with ML
├── esp32_production_working.ino        # ESP32 code without ML
├── esp32_test_offline_mode.ino         # Test file for offline mode
├── server.js                           # Standalone WebSocket server
├── server-integrated.js                # Integrated server (WebSocket + Next.js)
│                                        # Uses Groq Llama 3.3 70B for AI analysis
├── package.json                        # Backend dependencies
├── kill-port.ps1                       # Script to kill port
├── .env                                # Environment variables (GROQ_API_KEY)
├── nextjs-dashboard/                   # Next.js dashboard
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── SensorCard.tsx
│   │   ├── SensorChart.tsx
│   │   ├── DeviceInfo.tsx
│   │   └── AIAnalysis.tsx
│   ├── hooks/
│   │   └── useWebSocket.ts
│   └── package.json
├── esp32_sensor_test/                  # Test scripts for sensors
│   ├── esp32_sensor_test.ino
│   ├── I2C_SCANNER.ino
│   └── README.md
├── ml_datasets/                        # ML training scripts & models
│   ├── train_model.py                  # Train Keras model
│   ├── convert_to_tflite.py           # Convert to TFLite
│   ├── download_datasets.py           # Download datasets
│   ├── download_india_singapore.py     # Download from WAQI API
│   ├── requirements.txt                # Python dependencies
│   ├── models/                          # Trained ML models
│   │   ├── pm_predictor.h5             # Keras model
│   │   ├── pm_predictor.tflite         # TensorFlow Lite
│   │   ├── pm_predictor_quantized.tflite # Quantized TFLite
│   │   ├── scaler_X.pkl                # Input scaler
│   │   ├── scaler_y.pkl                # Output scaler
│   │   └── model_info.json             # Model metadata
│   ├── raw/                            # Raw datasets
│   │   ├── reference/
│   │   │   └── beijing_pm25.csv        # Beijing PM2.5 (UCI)
│   │   ├── india/                      # India datasets
│   │   ├── singapore/                   # Singapore datasets
│   │   └── waqi/
│   │       └── sample_structure.json    # WAQI API template
│   └── processed/                      # Processed datasets
│       └── sample_india_singapore_dataset.csv # Training dataset
└── README.md                           # This file
```

---

## 🔌 API Endpoints

### GET /api/status
Get server status and statistics

**Response:**
```json
{
  "service": "Integrated Server",
  "status": "running",
  "stats": {
    "activeClients": 1,
    "totalConnections": 1,
    "uptime": 3600
  },
  "latestData": { ... },
  "dashboards": {
    "nextjs": "http://localhost:3001"
  }
}
```

### GET /api/sensor
Get latest sensor data

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "clients": 1,
  "memory": { ... },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 🧪 Testing

### Test Sensor (SGP30 & BME280)

```bash
cd esp32_sensor_test
# Upload esp32_sensor_test.ino to ESP32
# Open Serial Monitor (115200 baud)
```

### Test Offline Mode (ML)

1. Upload `esp32_test_offline_mode.ino` to ESP32
2. Set `FORCE_OFFLINE_MODE = true` in code
3. Monitor Serial Monitor for ML predictions

### Test I2C Scanner

```bash
cd esp32_sensor_test
# Upload I2C_SCANNER.ino to ESP32
# Open Serial Monitor to see I2C addresses
```

---

## 📊 Datasets

### Included Datasets

**Location**: `ml_datasets/raw/` and `ml_datasets/processed/`

#### 1. Beijing PM2.5 Dataset (Reference)
- **File**: `ml_datasets/raw/reference/beijing_pm25.csv`
- **Size**: ~1.96 MB
- **Records**: ~43,824
- **Source**: UCI Machine Learning Repository
- **Link**: https://archive.ics.uci.edu/ml/datasets/Beijing+PM2.5+Data
- **License**: Public Domain
- **Features**: PM2.5, Temperature, Pressure, Dew point, Wind speed/direction, Time features

#### 2. Sample India & Singapore Dataset (Training)
- **File**: `ml_datasets/processed/sample_india_singapore_dataset.csv`
- **Size**: ~200 KB
- **Records**: 2,000 (1,000 India + 1,000 Singapore)
- **Source**: Generated based on typical patterns from India and Singapore air quality data
- **Features**: timestamp, temperature, humidity, pressure, pm25, pm10, voc, eco2, location
- **Usage**: Primary training dataset for ML model

**Dataset Statistics:**
- **India Pattern**: PM2.5 ~45.5 µg/m³, PM10 ~71.1 µg/m³ (higher pollution)
- **Singapore Pattern**: PM2.5 ~14.1 µg/m³, PM10 ~24.0 µg/m³ (lower pollution, tropical)

#### 3. WAQI Sample Structure
- **File**: `ml_datasets/raw/waqi/sample_structure.json`
- **Purpose**: Template for WAQI API data structure
- **Note**: For real-time data, requires WAQI API token (free from https://aqicn.org/api/)

### External Dataset Sources

#### India Datasets
1. **India Indoor Air Quality Dataset**
   - **Source**: ArXiv (https://arxiv.org/abs/2407.14501)
   - **Features**: PM2.5, PM10, Temperature, Humidity, CO2, CO, VOC
   - **Size**: ~5-10 MB, 50,000+ records
   - **Download**: Check paper for GitHub/Zenodo link

2. **Central Pollution Control Board (CPCB) India**
   - **Source**: https://cpcb.nic.in/
   - **Features**: PM2.5, PM10, NO2, SO2, O3, CO, Temperature, Humidity
   - **Access**: Website or API

#### Singapore Datasets
1. **National Environment Agency (NEA) Singapore**
   - **Source**: https://www.nea.gov.sg/ or https://data.gov.sg/
   - **Features**: PM2.5, PM10, PSI, NO2, SO2, O3, CO, Temperature, Humidity
   - **Access**: Website or API

2. **WAQI API (World Air Quality Index)**
   - **Source**: https://waqi.info/ or https://aqicn.org/api/
   - **Features**: PM2.5, PM10, AQI, Temperature, Humidity
   - **Access**: Free API token required
   - **Coverage**: Multiple cities in India and Singapore

### Dataset Download Scripts

**Scripts Location**: `ml_datasets/`

1. **`download_datasets.py`** - General dataset downloader
   - Downloads Beijing PM2.5 from UCI
   - Downloads other public datasets

2. **`download_india_singapore.py`** - WAQI API downloader
   - Downloads real-time data from WAQI API
   - Requires WAQI API token
   - Supports multiple cities (Delhi, Mumbai, Singapore, etc.)

**Usage:**
```bash
cd ml_datasets
python download_datasets.py
python download_india_singapore.py  # Requires WAQI_TOKEN in script
```

---

## 📚 Additional Resources

### Sensor Documentation
- **SGP30**: https://www.adafruit.com/product/3709
- **BME280**: https://www.adafruit.com/product/2652
- **DSM501A**: Compatible with Grove Dust Sensor code
- **Grove Dust Sensor**: https://wiki.seeedstudio.com/Grove-Dust_Sensor/

### Libraries
- **Adafruit SGP30**: https://github.com/adafruit/Adafruit_SGP30
- **Adafruit BME280**: https://github.com/adafruit/Adafruit_BME280_Library
- **ArduinoJson**: https://arduinojson.org/
- **WebSockets**: https://github.com/Links2004/arduinoWebSockets

### ML Resources
- **TinyML Book**: https://www.oreilly.com/library/view/tinyml/9781492052036/
- **TensorFlow Lite**: https://www.tensorflow.org/lite/microcontrollers
- **ESP32 TensorFlow Lite**: https://github.com/tensorflow/tflite-micro-arduino-examples

### AI/ML Model References
- **Groq API**: https://groq.com/
- **Llama 3.3 70B**: https://groq.com/models/llama-3-3-70b-versatile/
- **TensorFlow**: https://www.tensorflow.org/
- **Keras**: https://keras.io/
- **Scikit-learn**: https://scikit-learn.org/

### Dataset Sources
- **UCI ML Repository**: https://archive.ics.uci.edu/ml/index.php
- **Beijing PM2.5 Dataset**: https://archive.ics.uci.edu/ml/datasets/Beijing+PM2.5+Data
- **WAQI API**: https://aqicn.org/api/
- **India CPCB**: https://cpcb.nic.in/
- **Singapore NEA**: https://www.nea.gov.sg/
- **data.gov.sg**: https://data.gov.sg/

---

## ⚙️ Configuration

### ESP32 Timing Configuration

```cpp
const unsigned long sendInterval = 3000;      // Send data every 3 seconds
const unsigned long dustSampleTime = 30000;   // Dust sensor sample time (30 seconds)
```

### AI Analysis Configuration

```javascript
const AI_ANALYSIS_INTERVAL = 5 * 60 * 1000;  // 5 minutes
```

### ML Prediction Ranges

```cpp
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
```

---

## 🎯 Use Cases

### Industrial Air Quality Monitoring
- Factory and manufacturing facilities
- Industrial plants and warehouses
- Research laboratories
- Indoor air quality monitoring
- Environmental compliance tracking

### Features for Industrial Use
- ✅ Continuous monitoring without interruption
- ✅ ML predictions during network outage
- ✅ AI-powered insights for decision making
- ✅ Automatic ventilation control
- ✅ Real-time alerts and notifications
- ✅ Historical data tracking

---

## 📊 Performance Metrics

### Code Metrics
- **ESP32 Code**: ~768 lines (Production ML version)
- **Backend Server**: ~450 lines (Node.js)
- **Frontend Dashboard**: ~500 lines (TypeScript/React)
- **ML Training Scripts**: ~300 lines (Python)
- **Total Project**: ~2,500+ lines of code

### System Performance
- **Data Send Interval**: 3 seconds
- **Dust Sensor Sample Time**: 30 seconds
- **AI Analysis Interval**: 5 minutes
- **WebSocket Heartbeat**: 30 seconds
- **ML Prediction Time**: < 1ms

---

## 🔒 Security Notes

- **API Keys**: Do not commit API keys to repository
- **WiFi Credentials**: Update in ESP32 code before deployment
- **Environment Variables**: Use `.env` file for sensitive data
- **WebSocket**: Consider adding authentication for production

---

## 📄 License

MIT License

---

## 👥 Team

**SL2 Team 6**

---

## 🆘 Support

If you encounter issues:
1. Check the Troubleshooting section above
2. Check Serial Monitor for error messages
3. Check server console for WebSocket errors
4. Check browser console (F12) for frontend errors

---

## 🚀 Future Enhancements

- [ ] Multi-device support
- [ ] Cloud storage integration
- [ ] Mobile app (React Native)
- [ ] Advanced ML models (TensorFlow Lite)
- [ ] Data export (CSV/JSON)
- [ ] Email/SMS alerts
- [ ] User authentication
- [ ] Historical data analysis

---

**Happy Monitoring! 🚀**
