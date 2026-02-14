"""
Script untuk download dataset air quality dari India dan Singapura
"""

import requests
import pandas as pd
import json
from datetime import datetime, timedelta
import os

# Create directories
os.makedirs('raw/india', exist_ok=True)
os.makedirs('raw/singapore', exist_ok=True)
os.makedirs('raw/waqi', exist_ok=True)

# ==========================================
# 1. WAQI API - India & Singapore
# ==========================================
def download_waqi_data(token, city='delhi', days=30):
    """
    Download data dari WAQI API
    
    Args:
        token: WAQI API token (dapatkan dari https://aqicn.org/api/)
        city: 'delhi', 'mumbai', 'singapore', dll
        days: jumlah hari data historis
    """
    print(f"Downloading WAQI data for {city}...")
    
    # Real-time data
    url = f"https://api.waqi.info/feed/{city}/?token={token}"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        
        if data['status'] == 'ok':
            # Save real-time data
            with open(f'raw/waqi/{city}_realtime.json', 'w') as f:
                json.dump(data, f, indent=2)
            
            # Extract and save to CSV
            aq_data = data['data']
            df = pd.DataFrame([{
                'timestamp': datetime.now().isoformat(),
                'city': city,
                'aqi': aq_data.get('aqi', 'N/A'),
                'pm25': aq_data.get('iaqi', {}).get('pm25', {}).get('v', 'N/A'),
                'pm10': aq_data.get('iaqi', {}).get('pm10', {}).get('v', 'N/A'),
                'temperature': aq_data.get('iaqi', {}).get('t', {}).get('v', 'N/A'),
                'humidity': aq_data.get('iaqi', {}).get('h', {}).get('v', 'N/A'),
                'pressure': aq_data.get('iaqi', {}).get('p', {}).get('v', 'N/A'),
            }])
            
            df.to_csv(f'raw/waqi/{city}_realtime.csv', index=False)
            print(f"✅ Saved: raw/waqi/{city}_realtime.csv")
        else:
            print(f"❌ Error: {data.get('data', 'Unknown error')}")
    else:
        print(f"❌ HTTP Error: {response.status_code}")

# ==========================================
# 2. India - CPCB Data (Manual)
# ==========================================
def download_cpcb_instructions():
    """
    Instructions untuk download data dari CPCB
    """
    print("\n" + "="*60)
    print("CPCB India Data Download Instructions")
    print("="*60)
    print("""
    1. Kunjungi: https://cpcb.nic.in/
    2. Navigate ke: Air Quality Data → Historical Data
    3. Pilih:
       - City: Delhi, Mumbai, Bangalore, dll
       - Parameter: PM2.5, PM10, NO2, SO2, O3, CO
       - Date Range: Pilih periode yang diinginkan
    4. Download file Excel/CSV
    5. Simpan ke: ml_datasets/raw/india/cpcb_[city]_[date].csv
    
    Alternative: Gunakan CPCB API jika tersedia
    """)

# ==========================================
# 3. Singapore - NEA Data
# ==========================================
def download_singapore_instructions():
    """
    Instructions untuk download data dari NEA Singapore
    """
    print("\n" + "="*60)
    print("Singapore NEA Data Download Instructions")
    print("="*60)
    print("""
    1. Kunjungi: https://data.gov.sg/
    2. Search: "air quality" atau "PSI"
    3. Pilih dataset yang sesuai
    4. Download CSV/JSON
    5. Simpan ke: ml_datasets/raw/singapore/nea_[date].csv
    
    Alternative: Gunakan NEA API
    - Website: https://www.nea.gov.sg/
    - API Docs: Check NEA website for API documentation
    """)

# ==========================================
# 4. India - Indoor Air Quality Dataset
# ==========================================
def download_india_indoor_instructions():
    """
    Instructions untuk download India Indoor Air Quality dataset
    """
    print("\n" + "="*60)
    print("India Indoor Air Quality Dataset")
    print("="*60)
    print("""
    1. Kunjungi: https://arxiv.org/abs/2407.14501
    2. Cek section "Supplementary Material" atau "Dataset"
    3. Download dari:
       - GitHub repository (jika ada)
       - Zenodo (jika ada)
       - Direct link dari paper
    4. Simpan ke: ml_datasets/raw/india/indoor_air_quality/
    
    Dataset includes:
    - 30 indoor locations
    - 6 months of data
    - PM2.5, PM10, CO2, CO, VOC, Temperature, Humidity
    """)

# ==========================================
# Main Function
# ==========================================
if __name__ == "__main__":
    print("="*60)
    print("India & Singapore Air Quality Dataset Downloader")
    print("="*60)
    
    # WAQI API Token (dapatkan dari https://aqicn.org/api/)
    WAQI_TOKEN = "YOUR_WAQI_TOKEN_HERE"  # Ganti dengan token Anda
    
    if WAQI_TOKEN == "YOUR_WAQI_TOKEN_HERE":
        print("\n⚠️  Warning: WAQI token belum di-set!")
        print("   Dapatkan token gratis di: https://aqicn.org/api/")
        print("   Edit file ini dan set WAQI_TOKEN")
    else:
        # Download WAQI data
        print("\n1. Downloading WAQI Data...")
        cities = ['delhi', 'mumbai', 'bangalore', 'singapore']
        for city in cities:
            try:
                download_waqi_data(WAQI_TOKEN, city)
            except Exception as e:
                print(f"   Error downloading {city}: {e}")
    
    # Print instructions untuk manual download
    print("\n2. Manual Download Instructions:")
    download_cpcb_instructions()
    download_singapore_instructions()
    download_india_indoor_instructions()
    
    print("\n" + "="*60)
    print("✅ Download script selesai!")
    print("="*60)
    print("\nNext steps:")
    print("1. Download manual dari CPCB, NEA, atau ArXiv")
    print("2. Run preprocessing script")
    print("3. Train model dengan data India/Singapore")

