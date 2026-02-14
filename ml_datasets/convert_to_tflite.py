"""
Convert Keras Model to TensorFlow Lite for ESP32
"""

import tensorflow as tf
import numpy as np
import os

print("="*60)
print("Converting Model to TensorFlow Lite for ESP32")
print("="*60)

# ==========================================
# 1. Load Model
# ==========================================
print("\n[1/3] Loading Keras model...")
model_path = "models/pm_predictor.h5"

if not os.path.exists(model_path):
    print(f"❌ Model not found: {model_path}")
    print("   Run train_model.py first!")
    exit(1)

try:
    # Try loading with compile=False to avoid metric deserialization issues
    model = tf.keras.models.load_model(model_path, compile=False)
    print(f"   ✅ Loaded: {model_path}")
except Exception as e:
    print(f"   ⚠️  Error loading model: {e}")
    print("   Rebuilding model from scratch...")
    # Rebuild model architecture (same as train_model.py)
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(16, activation='relu', input_shape=(3,), name='input'),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(8, activation='relu', name='hidden1'),
        tf.keras.layers.Dense(4, activation='relu', name='hidden2'),
        tf.keras.layers.Dense(2, activation='linear', name='output')
    ])
    # Load weights only
    model.load_weights(model_path.replace('.h5', '_weights.h5'))
    print("   ✅ Model rebuilt")

# ==========================================
# 2. Convert to TFLite
# ==========================================
print("\n[2/3] Converting to TensorFlow Lite...")

# Standard conversion
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

# Save standard TFLite
tflite_path = "models/pm_predictor.tflite"
with open(tflite_path, 'wb') as f:
    f.write(tflite_model)

size_kb = len(tflite_model) / 1024
print(f"   ✅ Saved: {tflite_path} ({size_kb:.1f} KB)")

# ==========================================
# 3. Quantized Conversion (Smaller size)
# ==========================================
print("\n[3/3] Creating quantized model (INT8)...")

# Quantized conversion (smaller, faster on ESP32)
converter_quant = tf.lite.TFLiteConverter.from_keras_model(model)
converter_quant.optimizations = [tf.lite.Optimize.DEFAULT]

# Representative dataset for quantization
def representative_dataset():
    # Use training data statistics
    # In real scenario, use actual training samples
    for i in range(100):
        yield [np.random.random((1, 3)).astype(np.float32)]

converter_quant.representative_dataset = representative_dataset
converter_quant.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter_quant.inference_input_type = tf.int8
converter_quant.inference_output_type = tf.int8

try:
    tflite_quant_model = converter_quant.convert()
    
    tflite_quant_path = "models/pm_predictor_quantized.tflite"
    with open(tflite_quant_path, 'wb') as f:
        f.write(tflite_quant_model)
    
    size_quant_kb = len(tflite_quant_model) / 1024
    print(f"   ✅ Saved: {tflite_quant_path} ({size_quant_kb:.1f} KB)")
    print(f"   Size reduction: {((size_kb - size_quant_kb) / size_kb * 100):.1f}%")
except Exception as e:
    print(f"   ⚠️  Quantization failed: {e}")
    print("   Using standard TFLite model")

# ==========================================
# 4. Test TFLite Model
# ==========================================
print("\n[4/4] Testing TFLite model...")

# Load TFLite model
interpreter = tf.lite.Interpreter(model_path=tflite_path)
interpreter.allocate_tensors()

# Get input/output details
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

print(f"   Input shape: {input_details[0]['shape']}")
print(f"   Output shape: {output_details[0]['shape']}")

# Test with sample input
test_input = np.array([[28.0, 65.0, 1013.0]], dtype=np.float32)
interpreter.set_tensor(input_details[0]['index'], test_input)
interpreter.invoke()
output = interpreter.get_tensor(output_details[0]['index'])

print(f"   Test input: T=28°C, H=65%, P=1013hPa")
print(f"   Test output: PM2.5={output[0][0]:.1f}, PM10={output[0][1]:.1f}")

print("\n" + "="*60)
print("✅ Conversion Complete!")
print("="*60)
print("\nFiles created:")
print(f"  - {tflite_path}")
if os.path.exists("models/pm_predictor_quantized.tflite"):
    print(f"  - models/pm_predictor_quantized.tflite")
print("\nNext steps:")
print("  1. Copy .tflite file to ESP32 project")
print("  2. Update ESP32 code to load and use model")
print("  3. Test offline mode prediction")

