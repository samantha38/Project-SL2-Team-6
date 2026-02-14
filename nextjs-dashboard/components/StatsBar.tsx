import { SensorStats } from '@/lib/sensorUtils'

interface StatItemProps {
    label: string
    icon: string
    stats: SensorStats
    unit: string
    color: string
}

function StatItem({ label, icon, stats, unit, color }: StatItemProps) {
    return (
        <div className="glass-card p-4 animate-slideUp">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{icon}</span>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {/* Min */}
                <div className="text-center rounded-lg bg-white/[0.02] border border-white/[0.04] py-2 px-1">
                    <div className="text-[9px] text-cyan-400 font-semibold uppercase tracking-widest mb-1">Min</div>
                    <div className="text-sm font-bold text-white">{stats.min || '--'}</div>
                    <div className="text-[9px] text-slate-600">{unit}</div>
                </div>
                {/* Avg */}
                <div className="text-center rounded-lg bg-white/[0.04] border border-white/[0.06] py-2 px-1">
                    <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color }}>Avg</div>
                    <div className="text-sm font-bold text-white">{stats.avg || '--'}</div>
                    <div className="text-[9px] text-slate-600">{unit}</div>
                </div>
                {/* Max */}
                <div className="text-center rounded-lg bg-white/[0.02] border border-white/[0.04] py-2 px-1">
                    <div className="text-[9px] text-rose-400 font-semibold uppercase tracking-widest mb-1">Max</div>
                    <div className="text-sm font-bold text-white">{stats.max || '--'}</div>
                    <div className="text-[9px] text-slate-600">{unit}</div>
                </div>
            </div>
        </div>
    )
}

interface StatsBarProps {
    history: any[]
}

export default function StatsBar({ history }: StatsBarProps) {
    // Calculate stats from history
    const calcStats = (key: string): SensorStats => {
        const values = history
            .map((d) => d[key])
            .filter((v) => v != null && !isNaN(v) && v > 0)

        if (values.length === 0) return { min: 0, max: 0, avg: 0 }

        const min = Math.min(...values)
        const max = Math.max(...values)
        const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length

        return {
            min: Math.round(min * 10) / 10,
            max: Math.round(max * 10) / 10,
            avg: Math.round(avg * 10) / 10,
        }
    }

    const dataPoints = history.length

    return (
        <div className="mb-6 animate-slideUp delay-400">
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <span className="text-base">📊</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Session Statistics</h3>
                        <p className="text-[11px] text-slate-500">
                            Min / Avg / Max from last {dataPoints} readings
                        </p>
                    </div>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-white/[0.04] text-slate-500 border border-white/[0.06]">
                    {dataPoints} data points
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatItem label="PM2.5" icon="🌫️" stats={calcStats('pm25')} unit="µg/m³" color="#fb7185" />
                <StatItem label="PM10" icon="🌪️" stats={calcStats('pm10')} unit="µg/m³" color="#fbbf24" />
                <StatItem label="VOC" icon="💨" stats={calcStats('voc')} unit="ppb" color="#a78bfa" />
                <StatItem label="Temp" icon="🌡️" stats={calcStats('temp_bmp')} unit="°C" color="#22d3ee" />
                <StatItem label="Humidity" icon="💧" stats={calcStats('humidity')} unit="%" color="#34d399" />
                <StatItem label="eCO2" icon="🌿" stats={calcStats('eco2')} unit="ppm" color="#60a5fa" />
            </div>
        </div>
    )
}
