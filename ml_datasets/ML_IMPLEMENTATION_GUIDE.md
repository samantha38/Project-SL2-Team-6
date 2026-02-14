# 🤖 Machine Learning Implementation Guide untuk ESP32

## 📋 Overview

Implementasi ML untuk prediksi PM2.5 dan PM10 ketika WiFi tidak tersedia, menggunakan model yang di-train dengan dataset India & Singapore.

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd ml_datasets
pip install -r requirements.txt
```

### Step 2: Train Model

```bash
python train_model.py
```

Ini akan:
- Load dataset
- Preprocess data
- Train neural network
- Evaluate model
- Save model ke `models/pm_predictor.h5`

### Step 3: Convert to TensorFlow Lite

```bash
python convert_to_tflite.py
```

Ini akan:
- Convert Keras model ke TFLite
- Create quantized version (smaller)
- Test model
- Save ke `models/pm_predictor.tflite`

### Step 4: Deploy ke ESP32

1. Copy `models/pm_predictor_quantized.tflite` ke ESP32 project
2. Update ESP32 code untuk load model
3. Test offline mode

---

## 📊 Model Architecture

### Input Features (3):
- Temperature (°C)
- Humidity (%)
- Pressure (hPa)

### Output Targets (2):
- PM2.5 (µg/m³)
- PM10 (µg/m³)

### Model Structure:
```
Input (3) → Dense(16) → Dropout(0.2) → Dense(8) → Dense(4) → Output(2)
```

### Model Size:
- Keras: ~1-2 KB
- TFLite: ~5-10 KB
- Quantized: ~2-5 KB

---

## 🔧 ESP32 Integration

### Opsi 1: Simple Polynomial Approximation (Current)

File: `esp32_production_working_ml.ino`

**Keuntungan:**
- ✅ Tidak perlu TensorFlow Lite library
- ✅ Sangat ringan (< 1KB code)
- ✅ Cepat (microseconds)
- ✅ Mudah di-debug

**Kekurangan:**
- ⚠️ Akurasi lebih rendah daripada full model
- ⚠️ Perlu update coefficients manual

### Opsi 2: Full TensorFlow Lite (Advanced)

**Requirements:**
- TensorFlow Lite for Microcontrollers library
- Model file (.tflite)
- More memory (~50-100KB)

**Keuntungan:**
- ✅ Akurasi tinggi
- ✅ Model bisa di-retrain tanpa code change
- ✅ Support complex models

**Kekurangan:**
- ⚠️ Butuh library tambahan
- ⚠️ Lebih besar memory footprint

---

## 📈 Model Performance

### Expected Metrics (Sample Dataset):

**PM2.5:**
- MSE: ~200-400
- MAE: ~10-15 µg/m³
- R²: ~0.6-0.8

**PM10:**
- MSE: ~400-800
- MAE: ~15-25 µg/m³
- R²: ~0.6-0.8

**Note:** Akurasi akan lebih baik dengan dataset real yang lebih besar.

---

## 🔄 Offline Mode Flow

```
WiFi Connected?
├─ YES → Use Sensor Reading (PM2.5/PM10 from sensors)
└─ NO  → Use ML Prediction
    ├─ Read: Temperature, Humidity, Pressure
    ├─ Normalize inputs
    ├─ Run ML model
    ├─ Denormalize outputs
    └─ Use predicted PM2.5/PM10
```

---

## 🧪 Testing

### Test Online Mode:
1. Connect WiFi
2. Verify sensor readings
3. Check WebSocket connection
4. Monitor dashboard

### Test Offline Mode:
1. Disconnect WiFi (atau unplug router)
2. ESP32 akan switch ke ML mode
3. Check Serial Monitor untuk ML predictions
4. Verify predictions reasonable

### Test ML Accuracy:
1. Compare ML predictions dengan actual sensor readings
2. Adjust model jika perlu
3. Retrain dengan lebih banyak data

---

## 📝 Code Structure

### ESP32 Code (`esp32_production_working_ml.ino`):

```cpp
// ML Prediction Functions
float predictPM25_ML(float temp, float hum, float press);
float predictPM10_ML(float temp, float hum, float press);

// Offline Mode Detection
if (WiFi.status() != WL_CONNECTED) {
  useMLPrediction = true;
  ml_pm25 = predictPM25_ML(temp, hum, press);
  ml_pm10 = predictPM10_ML(temp, hum, press);
}
```

### Training Script (`train_model.py`):
- Data loading & preprocessing
- Model training
- Evaluation
- Model saving

### Conversion Script (`convert_to_tflite.py`):
- Keras to TFLite conversion
- Quantization
- Model testing

---

## 🎯 Next Steps

### 1. Improve Model:
- Collect more real data
- Add more features (wind, time of day)
- Try different architectures
- Hyperparameter tuning

### 2. Full TFLite Integration:
- Install TensorFlow Lite Micro
- Load .tflite model
- Replace polynomial approximation

### 3. Model Updates:
- Retrain periodically
- A/B testing different models
- Online learning (advanced)

---

## 📚 Resources

- **TensorFlow Lite Micro:** https://www.tensorflow.org/lite/microcontrollers
- **ESP32 TensorFlow Examples:** https://github.com/tensorflow/tflite-micro-arduino-examples
- **TinyML Book:** https://www.oreilly.com/library/view/tinyml/9781492052036/

---

## ⚠️ Notes

1. **Model Size:** Keep < 100KB for ESP32
2. **Quantization:** Use INT8 for smaller size
3. **Features:** Limit to 3-5 features
4. **Accuracy:** Trade-off between accuracy and model size
5. **Update:** Retrain model periodically with new data

---

**Happy Training! 🎓**

