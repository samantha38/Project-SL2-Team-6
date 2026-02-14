'use client'

import { useState, useEffect, useCallback } from 'react'

interface Alert {
    id: number
    message: string
    sensor: string
    value: number
    threshold: number
    level: 'warning' | 'danger'
    timestamp: Date
}

interface AlertLogProps {
    sensorData: any
}

// Threshold definitions
const THRESHOLDS = {
    pm25: { warning: 35, danger: 55, unit: 'µg/m³', label: 'PM2.5' },
    pm10: { warning: 50, danger: 150, unit: 'µg/m³', label: 'PM10' },
    voc: { warning: 200, danger: 500, unit: 'ppb', label: 'VOC' },
    temperature: { warning: 35, danger: 40, unit: '°C', label: 'Temperature' },
    humidity: { warning: 80, danger: 90, unit: '%', label: 'Humidity' },
}

let alertIdCounter = 0

export default function AlertLog({ sensorData }: AlertLogProps) {
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [lastChecked, setLastChecked] = useState<Record<string, number>>({})

    // Check thresholds on new sensor data
    useEffect(() => {
        if (!sensorData || sensorData.type !== 'sensor_data') return

        const now = Date.now()
        const newAlerts: Alert[] = []

        const checkSensor = (key: string, value: number | undefined) => {
            if (value == null || value === 0) return
            const thresh = THRESHOLDS[key as keyof typeof THRESHOLDS]
            if (!thresh) return

            // Cooldown: don't alert same sensor within 30 seconds
            if (lastChecked[key] && now - lastChecked[key] < 30000) return

            if (value >= thresh.danger) {
                newAlerts.push({
                    id: ++alertIdCounter,
                    message: `${thresh.label} at ${value}${thresh.unit} — exceeds danger limit (${thresh.danger}${thresh.unit})`,
                    sensor: key,
                    value,
                    threshold: thresh.danger,
                    level: 'danger',
                    timestamp: new Date(),
                })
                setLastChecked((prev) => ({ ...prev, [key]: now }))
            } else if (value >= thresh.warning) {
                newAlerts.push({
                    id: ++alertIdCounter,
                    message: `${thresh.label} at ${value}${thresh.unit} — exceeds warning limit (${thresh.warning}${thresh.unit})`,
                    sensor: key,
                    value,
                    threshold: thresh.warning,
                    level: 'warning',
                    timestamp: new Date(),
                })
                setLastChecked((prev) => ({ ...prev, [key]: now }))
            }
        }

        checkSensor('pm25', sensorData.pm25)
        checkSensor('pm10', sensorData.pm10)
        checkSensor('voc', sensorData.voc)
        checkSensor('temperature', sensorData.temp_bmp || sensorData.temperature)
        checkSensor('humidity', sensorData.humidity)

        if (newAlerts.length > 0) {
            setAlerts((prev) => [...newAlerts, ...prev].slice(0, 50)) // Keep last 50 alerts
        }
    }, [sensorData])

    const clearAlerts = useCallback(() => setAlerts([]), [])

    const dangerCount = alerts.filter((a) => a.level === 'danger').length
    const warningCount = alerts.filter((a) => a.level === 'warning').length

    return (
        <div className="glass-card p-6 mb-6 animate-slideUp delay-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                        <span className="text-base">🔔</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Alert Log</h3>
                        <p className="text-[11px] text-slate-500">Threshold violation tracking</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {dangerCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                            {dangerCount} danger
                        </span>
                    )}
                    {warningCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                            {warningCount} warning
                        </span>
                    )}
                    {alerts.length > 0 && (
                        <button
                            onClick={clearAlerts}
                            className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:bg-white/[0.08] hover:text-slate-300 transition-colors duration-200"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Alert List */}
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {alerts.length === 0 ? (
                    <div className="text-center py-6">
                        <span className="text-2xl mb-2 block">✅</span>
                        <p className="text-xs text-slate-600">No threshold violations detected</p>
                        <p className="text-[10px] text-slate-700 mt-1">All sensors operating within safe limits</p>
                    </div>
                ) : (
                    alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 ${alert.level === 'danger'
                                    ? 'bg-rose-500/[0.05] border-rose-500/20'
                                    : 'bg-amber-500/[0.05] border-amber-500/20'
                                }`}
                        >
                            <span className="text-sm mt-0.5">
                                {alert.level === 'danger' ? '🚨' : '⚠️'}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium ${alert.level === 'danger' ? 'text-rose-300' : 'text-amber-300'
                                    }`}>
                                    {alert.message}
                                </p>
                                <p className="text-[10px] text-slate-600 mt-0.5">
                                    {alert.timestamp.toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
