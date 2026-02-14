'use client'

import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface SensorCardProps {
  title: string
  value: string | number
  unit: string
  icon: string
  accentColor?: string
  trend?: 'up' | 'down' | 'stable'
  status?: 'good' | 'warning' | 'danger'
  sparkData?: number[]
  sparkColor?: string
}

const statusColors = {
  good: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
}

const trendIcons = {
  up: '↑',
  down: '↓',
  stable: '→',
}

const trendColors = {
  up: 'text-rose-400',
  down: 'text-emerald-400',
  stable: 'text-slate-400',
}

export default function SensorCard({
  title,
  value,
  unit,
  icon,
  accentColor = 'from-cyan-400 to-blue-500',
  trend,
  status,
  sparkData,
  sparkColor = '#22d3ee',
}: SensorCardProps) {
  // Transform sparkData to chart format
  const chartData = sparkData?.map((v, i) => ({ i, v })) ?? []

  return (
    <div className="group glass-card relative overflow-hidden p-5 cursor-default animate-slideUp">
      {/* Accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${accentColor} opacity-60 group-hover:opacity-100 transition-opacity duration-300`}
      />

      {/* Hover glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${accentColor} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 rounded-2xl`}
      />

      {/* Header row */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          {status && (
            <span
              className={`w-2 h-2 rounded-full ${statusColors[status]} animate-pulseGlow`}
            />
          )}
          <h3 className="text-sm font-medium text-slate-400 tracking-wide uppercase">
            {title}
          </h3>
        </div>
        <span className="text-2xl opacity-70 group-hover:opacity-100 group-hover:animate-float transition-opacity duration-300">
          {icon}
        </span>
      </div>

      {/* Value */}
      <div className="relative z-10">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white tracking-tight">
            {value}
          </span>
          <span className="text-sm font-medium text-slate-500">{unit}</span>
          {trend && (
            <span className={`text-sm font-semibold ${trendColors[trend]} ml-auto`}>
              {trendIcons[trend]}
            </span>
          )}
        </div>
      </div>

      {/* Sparkline */}
      {chartData.length > 1 && (
        <div className="mt-3 relative z-10" style={{ height: 32 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                fill={`url(#spark-${title.replace(/\s+/g, '')})`}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom subtle line */}
      <div className={`${chartData.length > 1 ? 'mt-2' : 'mt-4'} pt-3 border-t border-white/[0.04] relative z-10`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-600 uppercase tracking-widest">
            {chartData.length > 1 ? `${chartData.length} pts` : 'Live'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
