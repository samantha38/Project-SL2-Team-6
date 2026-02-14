'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SensorCard from '@/components/SensorCard'
import SensorChart from '@/components/SensorChart'
import DeviceInfo from '@/components/DeviceInfo'
import AIAnalysis from '@/components/AIAnalysis'
import StatsBar from '@/components/StatsBar'
import AlertLog from '@/components/AlertLog'
import PumpControl from '@/components/PumpControl'
import DataExport from '@/components/DataExport'
import AQIGauge from '@/components/AQIGauge'
import SensorHeatmap from '@/components/SensorHeatmap'
import useWebSocket from '@/hooks/useWebSocket'
import { calculateAQI, calculateHeatIndex } from '@/lib/sensorUtils'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()
  const { sensorData, isConnected, aiAnalysis, lastDataTime, history } = useWebSocket('ws://localhost:3000')
  const [clock, setClock] = useState('')
  const [uptime, setUptime] = useState(0)

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Uptime counter (seconds since mount)
  useEffect(() => {
    const id = setInterval(() => setUptime((u) => u + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const getTimeSinceLastData = () => {
    if (!lastDataTime) return null
    const seconds = Math.floor((Date.now() - lastDataTime) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s ago`
  }

  // Determine sensor health statuses
  const getVocStatus = (): 'good' | 'warning' | 'danger' => {
    const v = sensorData?.voc
    if (!v) return 'good'
    if (v > 500) return 'danger'
    if (v > 200) return 'warning'
    return 'good'
  }

  const getPmStatus = (val?: number): 'good' | 'warning' | 'danger' => {
    if (!val) return 'good'
    if (val > 55) return 'danger'
    if (val > 35) return 'warning'
    return 'good'
  }

  // Computed metrics
  const aqi = useMemo(() => {
    const pm25 = sensorData?.pm25
    if (pm25 == null || pm25 === 0) return null
    return calculateAQI(pm25)
  }, [sensorData?.pm25])

  const heatIndex = useMemo(() => {
    const temp = sensorData?.temp_bmp ?? sensorData?.temperature
    const hum = sensorData?.humidity
    if (!temp || !hum) return null
    return calculateHeatIndex(temp, hum)
  }, [sensorData?.temp_bmp, sensorData?.temperature, sensorData?.humidity])

  // Sparkline data extractor — last 10 values for a given sensor key
  const getSparkData = useCallback(
    (key: string): number[] => {
      return history
        .slice(-10)
        .map((d: Record<string, any>) => d[key])
        .filter((v): v is number => v != null && !isNaN(v))
    },
    [history]
  )

  // Auth guard returns — MUST be after all hooks
  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface bg-gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <span className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin inline-block mb-4" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </main>
    )
  }
  if (!isAuthenticated) return null

  return (
    <main className="min-h-screen bg-surface bg-gradient-mesh">
      {/* Background decorative blurs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-violet-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-rose-500/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6">

        {/* ─── Status Bar ─── */}
        <div className="flex items-center justify-between mb-6 animate-fadeIn">
          <div className="flex items-center gap-4">
            {/* Connection indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
              />
              <span className="text-xs font-medium text-slate-400">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* ML badge */}
            {sensorData?.ml_mode && (
              <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                🤖 ML Mode
              </span>
            )}

            {/* Last data */}
            {lastDataTime && (
              <span className="text-[11px] text-slate-600">
                Last data: {getTimeSinceLastData()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-600">
              Uptime {formatUptime(uptime)}
            </span>
            <span className="text-sm font-mono text-slate-400 tabular-nums tracking-wider">
              {clock}
            </span>
            {/* User info & logout */}
            <div className="flex items-center gap-2 pl-3 border-l border-white/[0.06]">
              <span className="text-[11px] text-slate-400">
                👤 {user?.username}
              </span>
              <button
                onClick={logout}
                className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* ─── Header ─── */}
        <header className="mb-8 animate-slideUp">
          <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-1">
            CleanKiln DT
          </h1>
          <p className="text-sm text-slate-500">
            Industrial Air Quality Monitoring · ESP32-S3
          </p>
        </header>

        {/* ─── Sensor Cards Grid ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          <SensorCard
            title="VOC"
            value={sensorData?.voc ?? '--'}
            unit="ppb"
            icon="💨"
            accentColor="from-violet-400 to-purple-500"
            status={getVocStatus()}
            sparkData={getSparkData('voc')}
            sparkColor="#a78bfa"
          />
          <SensorCard
            title={sensorData?.ml_mode ? 'PM2.5 (ML)' : 'PM2.5'}
            value={sensorData?.pm25 ?? '--'}
            unit="µg/m³"
            icon={sensorData?.ml_mode ? '🤖' : '🌫️'}
            accentColor="from-rose-400 to-pink-500"
            status={getPmStatus(sensorData?.pm25)}
            sparkData={getSparkData('pm25')}
            sparkColor="#fb7185"
          />
          <SensorCard
            title={sensorData?.ml_mode ? 'PM10 (ML)' : 'PM10'}
            value={
              sensorData?.pm10 !== undefined && sensorData.pm10 !== null
                ? typeof sensorData.pm10 === 'number'
                  ? sensorData.pm10.toFixed(2)
                  : sensorData.pm10
                : '--'
            }
            unit="µg/m³"
            icon={sensorData?.ml_mode ? '🤖' : '🌪️'}
            accentColor="from-amber-400 to-orange-500"
            status={getPmStatus(sensorData?.pm10)}
            sparkData={getSparkData('pm10')}
            sparkColor="#fbbf24"
          />
          <SensorCard
            title="Temperature"
            value={
              (sensorData?.temp_bmp ?? sensorData?.temperature)
                ? (sensorData?.temp_bmp ?? sensorData?.temperature ?? 0).toFixed(1)
                : '--'
            }
            unit="°C"
            icon="🌡️"
            accentColor="from-cyan-400 to-blue-500"
            sparkData={getSparkData('temp_bmp')}
            sparkColor="#22d3ee"
          />
          <SensorCard
            title="Pressure"
            value={sensorData?.pressure ? sensorData.pressure.toFixed(1) : '--'}
            unit="hPa"
            icon="🔽"
            accentColor="from-blue-400 to-indigo-500"
            sparkData={getSparkData('pressure')}
            sparkColor="#818cf8"
          />
          <SensorCard
            title="Humidity"
            value={sensorData?.humidity ? sensorData.humidity.toFixed(1) : '--'}
            unit="%"
            icon="💧"
            accentColor="from-emerald-400 to-teal-500"
            sparkData={getSparkData('humidity')}
            sparkColor="#34d399"
          />
          <SensorCard
            title="eCO2"
            value={sensorData?.eco2 ?? '--'}
            unit="ppm"
            icon="🌿"
            accentColor="from-teal-400 to-emerald-500"
            sparkData={getSparkData('eco2')}
            sparkColor="#2dd4bf"
          />
          <SensorCard
            title="Status"
            value={sensorData?.status ?? '--'}
            unit=""
            icon={sensorData?.status === 'Healthy' ? '✅' : '⚠️'}
            accentColor={
              sensorData?.status === 'Healthy'
                ? 'from-emerald-400 to-green-500'
                : 'from-amber-400 to-orange-500'
            }
            status={sensorData?.status === 'Healthy' ? 'good' : 'warning'}
          />
          {/* AQI Card */}
          <SensorCard
            title="AQI"
            value={aqi ? aqi.value : '--'}
            unit={aqi ? aqi.label : 'Air Quality Index'}
            icon="🎯"
            accentColor={aqi ? aqi.bgClass : 'from-slate-400 to-slate-500'}
            status={aqi ? (aqi.value <= 50 ? 'good' : aqi.value <= 100 ? 'warning' : 'danger') : undefined}
          />
          {/* Heat Index Card */}
          <SensorCard
            title="Heat Index"
            value={heatIndex ? `${heatIndex.value}` : '--'}
            unit={heatIndex ? `°C · ${heatIndex.label}` : '°C'}
            icon="🔥"
            accentColor={heatIndex ? heatIndex.bgClass : 'from-slate-400 to-slate-500'}
            status={heatIndex ? (heatIndex.value < 27 ? 'good' : heatIndex.value < 32 ? 'warning' : 'danger') : undefined}
          />
        </div>

        {/* ─── Charts ─── */}
        <SensorChart />

        {/* ─── AQI Gauge & Heatmap ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <AQIGauge aqi={aqi} />
          <SensorHeatmap sensorData={sensorData} />
        </div>

        {/* ─── Session Statistics ─── */}
        <StatsBar history={history} />

        {/* ─── AI Analysis ─── */}
        <AIAnalysis aiAnalysis={aiAnalysis} />

        {/* ─── Alert Log ─── */}
        <AlertLog sensorData={sensorData} />

        {/* ─── Control & Export ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <PumpControl isConnected={isConnected} />
          <DataExport history={history} sensorData={sensorData} />
        </div>

        {/* ─── Device Info ─── */}
        <DeviceInfo sensorData={sensorData} />

        {/* ─── Footer ─── */}
        <footer className="mt-8 pb-4 text-center animate-fadeIn">
          <p className="text-[11px] text-slate-700">
            CleanKiln DT v1.0 · Built with Next.js & Recharts · © 2026 SL2 Team 6
          </p>
        </footer>
      </div>
    </main>
  )
}
