'use client'

interface SensorLevel {
    key: string
    label: string
    value: number | null
    unit: string
    thresholds: { good: number; warning: number; danger: number }
}

interface SensorHeatmapProps {
    sensorData: any
}

function getLevel(value: number | null, thresholds: { good: number; warning: number; danger: number }): {
    level: 'none' | 'good' | 'warning' | 'danger'
    intensity: number
} {
    if (value == null || value === 0) return { level: 'none', intensity: 0 }
    if (value <= thresholds.good) return { level: 'good', intensity: value / thresholds.good }
    if (value <= thresholds.warning) return { level: 'warning', intensity: (value - thresholds.good) / (thresholds.warning - thresholds.good) }
    return { level: 'danger', intensity: Math.min((value - thresholds.warning) / (thresholds.danger - thresholds.warning), 1) }
}

const levelStyles = {
    none: {
        bg: 'bg-white/[0.03]',
        border: 'border-white/[0.05]',
        text: 'text-slate-600',
        dot: 'bg-slate-600',
    },
    good: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
    },
    warning: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        dot: 'bg-amber-400',
    },
    danger: {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        text: 'text-rose-400',
        dot: 'bg-rose-400',
    },
}

export default function SensorHeatmap({ sensorData }: SensorHeatmapProps) {
    const sensors: SensorLevel[] = [
        {
            key: 'pm25',
            label: 'PM2.5',
            value: sensorData?.pm25 ?? null,
            unit: 'µg/m³',
            thresholds: { good: 12, warning: 35, danger: 55 },
        },
        {
            key: 'pm10',
            label: 'PM10',
            value: sensorData?.pm10 ?? null,
            unit: 'µg/m³',
            thresholds: { good: 50, warning: 150, danger: 250 },
        },
        {
            key: 'voc',
            label: 'VOC',
            value: sensorData?.voc ?? null,
            unit: 'ppb',
            thresholds: { good: 100, warning: 200, danger: 500 },
        },
        {
            key: 'temperature',
            label: 'Temp',
            value: sensorData?.temp_bmp ?? sensorData?.temperature ?? null,
            unit: '°C',
            thresholds: { good: 28, warning: 35, danger: 40 },
        },
        {
            key: 'humidity',
            label: 'Humidity',
            value: sensorData?.humidity ?? null,
            unit: '%',
            thresholds: { good: 60, warning: 80, danger: 90 },
        },
        {
            key: 'eco2',
            label: 'eCO2',
            value: sensorData?.eco2 ?? null,
            unit: 'ppm',
            thresholds: { good: 400, warning: 1000, danger: 2000 },
        },
        {
            key: 'pressure',
            label: 'Pressure',
            value: sensorData?.pressure ?? null,
            unit: 'hPa',
            thresholds: { good: 1013, warning: 1030, danger: 1050 },
        },
        {
            key: 'altitude',
            label: 'Altitude',
            value: sensorData?.altitude ?? null,
            unit: 'm',
            thresholds: { good: 500, warning: 1500, danger: 3000 },
        },
    ]

    const dangerCount = sensors.filter((s) => getLevel(s.value, s.thresholds).level === 'danger').length
    const warningCount = sensors.filter((s) => getLevel(s.value, s.thresholds).level === 'warning').length
    const goodCount = sensors.filter((s) => {
        const l = getLevel(s.value, s.thresholds).level
        return l === 'good'
    }).length

    return (
        <div className="glass-card p-6 mb-6 animate-slideUp delay-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <span className="text-base">🗺️</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Sensor Heatmap</h3>
                        <p className="text-[11px] text-slate-500">At-a-glance danger levels</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {goodCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            {goodCount} safe
                        </span>
                    )}
                    {warningCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                            {warningCount} caution
                        </span>
                    )}
                    {dangerCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                            {dangerCount} danger
                        </span>
                    )}
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {sensors.map((sensor) => {
                    const { level } = getLevel(sensor.value, sensor.thresholds)
                    const style = levelStyles[level]

                    return (
                        <div
                            key={sensor.key}
                            className={`relative rounded-xl p-3 border text-center transition-all duration-500 hover:scale-105 ${style.bg} ${style.border}`}
                        >
                            {/* Status dot */}
                            <div className="absolute top-1.5 right-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full inline-block ${style.dot} ${level !== 'none' ? 'animate-pulse' : ''}`} />
                            </div>

                            {/* Label */}
                            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5 font-medium">
                                {sensor.label}
                            </div>

                            {/* Value */}
                            <div className={`text-lg font-bold ${style.text} leading-none mb-1`}>
                                {sensor.value != null ? (typeof sensor.value === 'number' ? sensor.value.toFixed(sensor.value < 100 ? 1 : 0) : sensor.value) : '--'}
                            </div>

                            {/* Unit */}
                            <div className="text-[8px] text-slate-600">{sensor.unit}</div>

                            {/* Level bar */}
                            <div className="mt-1.5 h-[2px] rounded-full bg-white/[0.04] overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${level === 'good' ? 'bg-emerald-400' :
                                            level === 'warning' ? 'bg-amber-400' :
                                                level === 'danger' ? 'bg-rose-400' : 'bg-slate-700'
                                        }`}
                                    style={{
                                        width: level === 'none' ? '0%' : `${Math.max(10, getLevel(sensor.value, sensor.thresholds).intensity * 100)}%`
                                    }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4">
                {[
                    { label: 'Safe', color: 'bg-emerald-400' },
                    { label: 'Caution', color: 'bg-amber-400' },
                    { label: 'Danger', color: 'bg-rose-400' },
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className="text-[10px] text-slate-500">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
