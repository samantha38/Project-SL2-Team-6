'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { AQIResult } from '@/lib/sensorUtils'

interface AQIGaugeProps {
    aqi: AQIResult | null
}

export default function AQIGauge({ aqi }: AQIGaugeProps) {
    const value = aqi?.value ?? 0
    const maxAQI = 500

    // Gauge data: filled portion + remaining
    const filled = Math.min(value, maxAQI)
    const remaining = maxAQI - filled

    const gaugeData = [
        { name: 'AQI', value: filled },
        { name: 'Remaining', value: remaining },
    ]

    // AQI color bands for the background ring
    const bgSegments = [
        { name: 'Good', value: 50, color: 'rgba(52, 211, 153, 0.1)' },
        { name: 'Moderate', value: 50, color: 'rgba(251, 191, 36, 0.1)' },
        { name: 'USG', value: 50, color: 'rgba(251, 146, 60, 0.1)' },
        { name: 'Unhealthy', value: 50, color: 'rgba(251, 113, 133, 0.1)' },
        { name: 'Very Unhealthy', value: 100, color: 'rgba(167, 139, 250, 0.1)' },
        { name: 'Hazardous', value: 200, color: 'rgba(239, 68, 68, 0.1)' },
    ]

    // Dynamic gradient for the filled arc
    const getGaugeColor = (val: number): string => {
        if (val <= 50) return '#34d399'
        if (val <= 100) return '#fbbf24'
        if (val <= 150) return '#fb923c'
        if (val <= 200) return '#fb7185'
        if (val <= 300) return '#a78bfa'
        return '#ef4444'
    }

    const gaugeColor = getGaugeColor(value)

    return (
        <div className="glass-card p-6 mb-6 animate-slideUp delay-300">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <span className="text-base">🎯</span>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">Air Quality Index</h3>
                    <p className="text-[11px] text-slate-500">EPA standard · Based on PM2.5</p>
                </div>
            </div>

            {/* Gauge */}
            <div className="relative w-full" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        {/* Background ring */}
                        <Pie
                            data={bgSegments}
                            cx="50%"
                            cy="60%"
                            startAngle={210}
                            endAngle={-30}
                            innerRadius="70%"
                            outerRadius="78%"
                            dataKey="value"
                            stroke="none"
                            isAnimationActive={false}
                        >
                            {bgSegments.map((entry, i) => (
                                <Cell key={`bg-${i}`} fill={entry.color} />
                            ))}
                        </Pie>

                        {/* Active gauge arc */}
                        <Pie
                            data={gaugeData}
                            cx="50%"
                            cy="60%"
                            startAngle={210}
                            endAngle={-30}
                            innerRadius="72%"
                            outerRadius="76%"
                            dataKey="value"
                            stroke="none"
                            cornerRadius={4}
                            animationBegin={200}
                            animationDuration={1200}
                            animationEasing="ease-out"
                        >
                            <Cell fill={gaugeColor} />
                            <Cell fill="transparent" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Center text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: '12%' }}>
                    <span
                        className="text-5xl font-bold tracking-tight"
                        style={{ color: gaugeColor }}
                    >
                        {aqi ? value : '--'}
                    </span>
                    <span className="text-xs font-medium mt-1" style={{ color: gaugeColor }}>
                        {aqi?.label ?? 'No Data'}
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                {[
                    { label: 'Good', color: '#34d399', range: '0-50' },
                    { label: 'Moderate', color: '#fbbf24', range: '51-100' },
                    { label: 'USG', color: '#fb923c', range: '101-150' },
                    { label: 'Unhealthy', color: '#fb7185', range: '151-200' },
                    { label: 'Very Bad', color: '#a78bfa', range: '201-300' },
                    { label: 'Hazardous', color: '#ef4444', range: '301+' },
                ].map((item) => (
                    <div
                        key={item.label}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border ${aqi?.label?.startsWith(item.label.substring(0, 4))
                                ? 'bg-white/[0.06] border-white/[0.12]'
                                : 'border-transparent'
                            }`}
                    >
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-slate-500">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
