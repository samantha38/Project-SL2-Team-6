# ESP32 Sensor Dashboard - Next.js

Modern, real-time sensor monitoring dashboard built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- 🔄 Real-time WebSocket connection to ESP32-S3
- 📊 Live sensor data visualization
- 📈 Interactive charts with Recharts
- 🎨 Beautiful UI with Tailwind CSS
- 📱 Fully responsive design
- ⚡ Fast and optimized with Next.js 14
- 🔌 Automatic reconnection on disconnect

## Prerequisites

- Node.js 18+ 
- npm or yarn
- WebSocket server running on `ws://localhost:8080`

## Installation

```bash
cd nextjs-dashboard
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production

Build for production:

```bash
npm run build
npm start
```

## Configuration

### WebSocket Server

The dashboard connects to `ws://localhost:8080` by default. To change this:

Edit `app/page.tsx`:
```typescript
const { sensorData, isConnected } = useWebSocket('ws://your-server:port')
```

## Sensor Data Format

Expected WebSocket message format:

```json
{
  "type": "sensor_data",
  "device": "ESP32-S3",
  "voc": 0,
  "pm25": 34,
  "pressure": 938.76,
  "altitude": 639.46,
  "temp_bmp": 27.45,
  "relay_state": "OFF",
  "moisture": 59,
  "raw_soil": 2495,
  "rssi": -63
}
```

## Project Structure

```
nextjs-dashboard/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard page
│   └── globals.css         # Global styles
├── components/
│   ├── SensorCard.tsx      # Sensor value card component
│   ├── SensorChart.tsx     # Chart component
│   └── DeviceInfo.tsx      # Device information component
├── hooks/
│   └── useWebSocket.ts     # WebSocket hook
├── public/                 # Static files
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Recharts** - Chart library
- **WebSocket** - Real-time communication

## Features

### Real-time Sensor Cards
- VOC (Volatile Organic Compounds)
- PM2.5 (Particulate Matter)
- Temperature
- Pressure
- Altitude
- Soil Moisture

### Interactive Charts
- PM2.5 trends
- VOC levels
- Temperature variations
- Moisture levels

### Device Information
- Device name
- WiFi signal strength (RSSI)
- Raw soil sensor values
- Relay state indicator

## Troubleshooting

### WebSocket not connecting

1. Make sure the WebSocket server is running on port 8080
2. Check the server URL in `app/page.tsx`
3. Verify CORS settings if needed

### Charts not updating

- Charts will populate automatically once data starts flowing from WebSocket
- Check browser console for any errors

## License

MIT



