"""
Train Machine Learning Model untuk ESP32 Offline Mode
Memprediksi PM2.5 dan PM10 berdasarkan Temperature, Humidity, Pressure
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import tensorflow as tf
from tensorflow import keras
import pickle
import os

print("="*60)
print("Training ML Model for ESP32 Offline Mode")
print("="*60)

# ==========================================
# 1. Load Dataset
# ==========================================
print("\n[1/5] Loading dataset...")
dataset_path = "processed/sample_india_singapore_dataset.csv"

if not os.path.exists(dataset_path):
    print(f"❌ Dataset not found: {dataset_path}")
    print("   Run download_datasets.py first!")
    exit(1)

df = pd.read_csv(dataset_path)
print(f"   ✅ Loaded: {len(df)} records")
print(f"   Columns: {list(df.columns)}")

# ==========================================
# 2. Preprocess Data
# ==========================================
print("\n[2/5] Preprocessing data...")

# Select features (input)
X = df[['temperature', 'humidity', 'pressure']].values
print(f"   Input features: temperature, humidity, pressure")
print(f"   Input shape: {X.shape}")

# Select targets (output)
y = df[['pm25', 'pm10']].values
print(f"   Output targets: pm25, pm10")
print(f"   Output shape: {y.shape}")

# Remove any NaN or infinite values
mask = ~(np.isnan(X).any(axis=1) | np.isnan(y).any(axis=1) | 
         np.isinf(X).any(axis=1) | np.isinf(y).any(axis=1))
X = X[mask]
y = y[mask]
print(f"   After cleaning: {len(X)} records")

# Split train/test
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"   Train: {len(X_train)} samples")
print(f"   Test: {len(X_test)} samples")

# Scale features (0-1 normalization)
scaler_X = MinMaxScaler()
scaler_y = MinMaxScaler()

X_train_scaled = scaler_X.fit_transform(X_train)
X_test_scaled = scaler_X.transform(X_test)
y_train_scaled = scaler_y.fit_transform(y_train)
y_test_scaled = scaler_y.transform(y_test)

print("   ✅ Data scaled (0-1 normalization)")

# Save scalers for ESP32
os.makedirs("models", exist_ok=True)
with open('models/scaler_X.pkl', 'wb') as f:
    pickle.dump(scaler_X, f)
with open('models/scaler_y.pkl', 'wb') as f:
    pickle.dump(scaler_y, f)
print("   ✅ Scalers saved: models/scaler_X.pkl, models/scaler_y.pkl")

# ==========================================
# 3. Build Neural Network Model
# ==========================================
print("\n[3/5] Building neural network model...")

# Simple model untuk ESP32 (lightweight)
model = keras.Sequential([
    keras.layers.Dense(16, activation='relu', input_shape=(3,), name='input'),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(8, activation='relu', name='hidden1'),
    keras.layers.Dense(4, activation='relu', name='hidden2'),
    keras.layers.Dense(2, activation='linear', name='output')  # PM2.5, PM10
])

model.compile(
    optimizer='adam',
    loss='mse',
    metrics=['mae']
)

print("   Model architecture:")
model.summary()

# Calculate model size
model_size = sum([tf.keras.backend.count_params(w) for w in model.trainable_weights])
print(f"   Total parameters: {model_size:,}")

# ==========================================
# 4. Train Model
# ==========================================
print("\n[4/5] Training model...")

# Training with early stopping
early_stopping = keras.callbacks.EarlyStopping(
    monitor='val_loss',
    patience=10,
    restore_best_weights=True
)

history = model.fit(
    X_train_scaled, y_train_scaled,
    validation_split=0.2,
    epochs=100,
    batch_size=32,
    verbose=1,
    callbacks=[early_stopping]
)

print("   ✅ Training complete!")

# ==========================================
# 5. Evaluate Model
# ==========================================
print("\n[5/5] Evaluating model...")

# Predictions
y_pred_scaled = model.predict(X_test_scaled)
y_pred = scaler_y.inverse_transform(y_pred_scaled)
y_test_actual = scaler_y.inverse_transform(y_test_scaled)

# Metrics
mse_pm25 = mean_squared_error(y_test_actual[:, 0], y_pred[:, 0])
mse_pm10 = mean_squared_error(y_test_actual[:, 1], y_pred[:, 1])
mae_pm25 = mean_absolute_error(y_test_actual[:, 0], y_pred[:, 0])
mae_pm10 = mean_absolute_error(y_test_actual[:, 1], y_pred[:, 1])
r2_pm25 = r2_score(y_test_actual[:, 0], y_pred[:, 0])
r2_pm10 = r2_score(y_test_actual[:, 1], y_pred[:, 1])

print("\n   Model Performance:")
print(f"   PM2.5:")
print(f"     - MSE: {mse_pm25:.2f}")
print(f"     - MAE: {mae_pm25:.2f} µg/m³")
print(f"     - R²:  {r2_pm25:.3f}")
print(f"   PM10:")
print(f"     - MSE: {mse_pm10:.2f}")
print(f"     - MAE: {mae_pm10:.2f} µg/m³")
print(f"     - R²:  {r2_pm10:.3f}")

# Sample predictions
print("\n   Sample Predictions:")
for i in range(5):
    print(f"   Test {i+1}:")
    print(f"     Input: T={X_test[i][0]:.1f}°C, H={X_test[i][1]:.1f}%, P={X_test[i][2]:.1f}hPa")
    print(f"     Actual: PM2.5={y_test_actual[i][0]:.1f}, PM10={y_test_actual[i][1]:.1f}")
    print(f"     Predicted: PM2.5={y_pred[i][0]:.1f}, PM10={y_pred[i][1]:.1f}")

# ==========================================
# 6. Save Model
# ==========================================
print("\n[6/6] Saving model...")

# Save Keras model (both formats for compatibility)
model.save('models/pm_predictor.h5')
model.save_weights('models/pm_predictor_weights.h5')
print("   ✅ Saved: models/pm_predictor.h5")
print("   ✅ Saved: models/pm_predictor_weights.h5")

# Save model info
model_info = {
    'input_features': ['temperature', 'humidity', 'pressure'],
    'output_targets': ['pm25', 'pm10'],
    'model_size': int(model_size),
    'mse_pm25': float(mse_pm25),
    'mse_pm10': float(mse_pm10),
    'mae_pm25': float(mae_pm25),
    'mae_pm10': float(mae_pm10),
    'r2_pm25': float(r2_pm25),
    'r2_pm10': float(r2_pm10),
}

import json
with open('models/model_info.json', 'w') as f:
    json.dump(model_info, f, indent=2)
print("   ✅ Saved: models/model_info.json")

print("\n" + "="*60)
print("✅ Training Complete!")
print("="*60)
print("\nNext steps:")
print("  1. Run convert_to_tflite.py to convert for ESP32")
print("  2. Update ESP32 code to use the model")
print("  3. Test offline mode")

