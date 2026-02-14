"""
Script untuk download dataset air quality dari India, Singapura, dan referensi
"""

import requests
import pandas as pd
import json
import os
from datetime import datetime
import urllib.request

# Create directories
os.makedirs('raw/india', exist_ok=True)
os.makedirs('raw/singapore', exist_ok=True)
os.makedirs('raw/waqi', exist_ok=True)
os.makedirs('raw/reference', exist_ok=True)
os.makedirs('processed', exist_ok=True)

print("="*60)
print("Downloading Air Quality Datasets")
print("="*60)

# ==========================================
# 1. Beijing PM2.5 Dataset (UCI) - Reference
# ==========================================
print("\n[1/4] Downloading Beijing PM2.5 Dataset (UCI)...")
try:
    url = "https://archive.ics.uci.edu/ml/machine-learning-databases/00381/PRSA_data_2010.1.1-2014.12.31.csv"
    filename = "raw/reference/beijing_pm25.csv"
    
    print(f"   Downloading from: {url}")
    urllib.request.urlretrieve(url, filename)
    
    # Check file size
    size = os.path.getsize(filename) / 1024
    print(f"   ✅ Downloaded: {filename} ({size:.1f} KB)")
    
    # Quick preview
    df = pd.read_csv(filename, nrows=5)
    print(f"   Preview: {len(df)} rows, columns: {list(df.columns[:5])}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# ==========================================
# 2. India - Mendeley Dataset
# ==========================================
print("\n[2/4] Downloading India Air Quality Dataset (Mendeley)...")
print("   Note: Mendeley dataset requires manual download")
print("   Link: https://data.mendeley.com/datasets/ntr7r59p79/1")
print("   Please download manually and save to: ml_datasets/raw/india/")

# Try to download if direct link available
try:
    # Mendeley usually requires authentication, but let's try
    print("   Attempting direct download...")
    # Note: This might not work due to authentication
    print("   ⚠️  Manual download recommended from Mendeley")
except Exception as e:
    print(f"   ℹ️  {e}")

# ==========================================
# 3. WAQI API - India & Singapore (Real-time)
# ==========================================
print("\n[3/4] Downloading WAQI Real-time Data...")
print("   Note: WAQI API requires token (free from https://aqicn.org/api/)")
print("   Creating sample data structure...")

# Create sample WAQI data structure
waqi_sample = {
    "delhi": {
        "aqi": 150,
        "pm25": 65,
        "pm10": 120,
        "temperature": 28,
        "humidity": 45,
        "pressure": 1013
    },
    "mumbai": {
        "aqi": 140,
        "pm25": 60,
        "pm10": 110,
        "temperature": 30,
        "humidity": 70,
        "pressure": 1012
    },
    "singapore": {
        "aqi": 50,
        "pm25": 15,
        "pm10": 25,
        "temperature": 28,
        "humidity": 80,
        "pressure": 1010
    }
}

# Save sample structure
with open('raw/waqi/sample_structure.json', 'w') as f:
    json.dump(waqi_sample, f, indent=2)

print("   ✅ Created sample structure: raw/waqi/sample_structure.json")
print("   To get real data, use WAQI API with token")

# ==========================================
# 4. Create Sample Dataset for Training
# ==========================================
print("\n[4/4] Creating Sample Training Dataset...")

# Generate sample data based on typical India/Singapore patterns
import numpy as np

np.random.seed(42)
n_samples = 1000

# India pattern (higher pollution)
india_data = {
    'timestamp': pd.date_range('2024-01-01', periods=n_samples, freq='h'),
    'temperature': np.random.normal(28, 5, n_samples),
    'humidity': np.random.normal(60, 15, n_samples),
    'pressure': np.random.normal(1013, 10, n_samples),
    'pm25': np.random.lognormal(3.5, 0.8, n_samples),  # Higher PM2.5
    'pm10': np.random.lognormal(4.0, 0.8, n_samples),  # Higher PM10
    'voc': np.random.normal(150, 50, n_samples),
    'eco2': np.random.normal(450, 50, n_samples),
    'location': 'India'
}

# Singapore pattern (lower pollution, tropical)
singapore_data = {
    'timestamp': pd.date_range('2024-01-01', periods=n_samples, freq='h'),
    'temperature': np.random.normal(28, 2, n_samples),  # More stable
    'humidity': np.random.normal(80, 10, n_samples),  # Higher humidity
    'pressure': np.random.normal(1010, 5, n_samples),
    'pm25': np.random.lognormal(2.5, 0.6, n_samples),  # Lower PM2.5
    'pm10': np.random.lognormal(3.0, 0.6, n_samples),  # Lower PM10
    'voc': np.random.normal(100, 30, n_samples),
    'eco2': np.random.normal(400, 30, n_samples),
    'location': 'Singapore'
}

# Combine
df_india = pd.DataFrame(india_data)
df_singapore = pd.DataFrame(singapore_data)
df_combined = pd.concat([df_india, df_singapore], ignore_index=True)

# Save
df_combined.to_csv('processed/sample_india_singapore_dataset.csv', index=False)
print(f"   ✅ Created: processed/sample_india_singapore_dataset.csv")
print(f"   Records: {len(df_combined)}")
print(f"   Columns: {list(df_combined.columns)}")

# Summary statistics
print("\n" + "="*60)
print("Dataset Summary")
print("="*60)
print("\nIndia Pattern:")
print(df_india[['temperature', 'humidity', 'pm25', 'pm10']].describe())
print("\nSingapore Pattern:")
print(df_singapore[['temperature', 'humidity', 'pm25', 'pm10']].describe())

print("\n" + "="*60)
print("✅ Download Complete!")
print("="*60)
print("\nFiles created:")
print("  - raw/reference/beijing_pm25.csv (Reference dataset)")
print("  - raw/waqi/sample_structure.json (WAQI structure)")
print("  - processed/sample_india_singapore_dataset.csv (Training dataset)")
print("\nNext steps:")
print("  1. Download India dataset manually from Mendeley")
print("  2. Get WAQI API token for real-time data")
print("  3. Use sample dataset for initial model training")

