'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import useWebSocket from '@/hooks/useWebSocket'

interface ChartData {
  time: string
  pm25: number
  pm10: number
  voc: number
  temp: number
  humidity: number
  eco2: number
}

export default function SensorChart() {
  const { sensorData } = useWebSocket('ws://localhost:3000')
  const [chartData, setChartData] = useState<ChartData[]>([])

  useEffect(() => {
    if (sensorData && sensorData.type === 'sensor_data') {
      const now = new Date()
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

      const newDataPoint: ChartData = {
        time: timeStr,
        pm25: sensorData.pm25 || 0,
        pm10: sensorData.pm10 || 0,
        voc: sensorData.voc || 0,
        temp: sensorData.temp_bmp || sensorData.temperature || 0,
        humidity: sensorData.humidity || 0,
        eco2: sensorData.eco2 || 0,
      }

      setChartData((prev) => {
        const updated = [...prev, newDataPoint]
        return updated.slice(-30)
      })
    }
  }, [sensorData])

  const commonAxisProps = {
    tick: { fill: '#64748b', fontSize: 11 },
    axisLine: { stroke: 'rgba(255,255,255,0.06)' },
    tickLine: { stroke: 'rgba(255,255,255,0.06)' },
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
      {/* Air Quality Chart */}
      <div className="glass-card p-6 animate-slideUp delay-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
            <span className="text-base">🌫️</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Air Quality</h3>
            <p className="text-[11px] text-slate-500">PM2.5 · PM10 · VOC</p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradPM25" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPM10" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradVOC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" {...commonAxisProps} />
              <YAxis {...commonAxisProps} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                itemStyle={{ color: '#cbd5e1' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
              />
              <Area
                type="monotone"
                dataKey="pm25"
                stroke="#fb7185"
                fill="url(#gradPM25)"
                name="PM2.5 (µg/m³)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#fb7185', strokeWidth: 2, fill: '#0a0e1a' }}
              />
              <Area
                type="monotone"
                dataKey="pm10"
                stroke="#fbbf24"
                fill="url(#gradPM10)"
                name="PM10 (µg/m³)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#fbbf24', strokeWidth: 2, fill: '#0a0e1a' }}
              />
              <Area
                type="monotone"
                dataKey="voc"
                stroke="#a78bfa"
                fill="url(#gradVOC)"
                name="VOC (ppb)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#a78bfa', strokeWidth: 2, fill: '#0a0e1a' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Environment Chart */}
      <div className="glass-card p-6 animate-slideUp delay-300">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <span className="text-base">🌡️</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Environment</h3>
            <p className="text-[11px] text-slate-500">Temperature · Humidity · eCO2</p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradHumidity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradEco2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" {...commonAxisProps} />
              <YAxis {...commonAxisProps} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                itemStyle={{ color: '#cbd5e1' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
              />
              <Area
                type="monotone"
                dataKey="temp"
                stroke="#22d3ee"
                fill="url(#gradTemp)"
                name="Temperature (°C)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#22d3ee', strokeWidth: 2, fill: '#0a0e1a' }}
              />
              <Area
                type="monotone"
                dataKey="humidity"
                stroke="#34d399"
                fill="url(#gradHumidity)"
                name="Humidity (%)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#34d399', strokeWidth: 2, fill: '#0a0e1a' }}
              />
              <Area
                type="monotone"
                dataKey="eco2"
                stroke="#60a5fa"
                fill="url(#gradEco2)"
                name="eCO2 (ppm)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#60a5fa', strokeWidth: 2, fill: '#0a0e1a' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
