# Setup Next.js Dashboard

## Quick Start

### 1. Install Dependencies

```bash
cd nextjs-dashboard
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Dashboard akan berjalan di: `http://localhost:3000`

### 3. Start WebSocket Server (Terminal berbeda)

Di terminal lain, jalankan Express server:

```bash
cd ..
node server.js
```

Server akan berjalan di: `http://localhost:8080`

## Verifikasi

1. **Next.js Dashboard**: `http://localhost:3000`
   - Harus melihat dashboard dengan status "Connected"
   
2. **WebSocket Server**: `http://localhost:8080`
   - Express server menerima data dari ESP32

3. **ESP32**: Upload kode ke ESP32-S3
   - ESP32 mengirim data ke server port 8080

## Ports

- **Next.js Dashboard**: Port 3000
- **WebSocket Server**: Port 8080
- **ESP32**: Connects to port 8080

## Development Mode

Mode development dengan hot reload:

```bash
npm run dev
```

Perubahan di kode akan otomatis reload.

## Production Build

Build untuk production:

```bash
npm run build
npm start
```

## Environment Variables (Optional)

Buat file `.env.local`:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

Lalu update `app/page.tsx`:

```typescript
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
const { sensorData, isConnected } = useWebSocket(wsUrl)
```

## Troubleshooting

### Error: Cannot find module

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use

```bash
npm run dev -- -p 3001
```

### WebSocket connection failed

1. Pastikan server.js berjalan
2. Cek URL WebSocket di `app/page.tsx`
3. Cek console browser (F12)

## Next Steps

1. Customize tampilan di `components/`
2. Tambah fitur baru di `app/page.tsx`
3. Modifikasi chart di `components/SensorChart.tsx`



