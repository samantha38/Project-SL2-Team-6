'use client'

import { useCallback } from 'react'

interface DataExportProps {
    history: any[]
    sensorData: any
}

export default function DataExport({ history, sensorData }: DataExportProps) {
    const exportCSV = useCallback(() => {
        if (history.length === 0) return

        // CSV headers
        const headers = [
            'Timestamp',
            'PM2.5 (µg/m³)',
            'PM10 (µg/m³)',
            'VOC (ppb)',
            'Temperature (°C)',
            'Humidity (%)',
            'Pressure (hPa)',
            'eCO2 (ppm)',
            'Altitude (m)',
            'Device',
            'Status',
            'Source',
        ]

        // CSV rows
        const rows = history.map((d) => [
            d.timestamp || new Date().toISOString(),
            d.pm25 ?? '',
            d.pm10 ?? '',
            d.voc ?? '',
            d.temp_bmp || d.temperature || '',
            d.humidity ?? '',
            d.pressure ?? '',
            d.eco2 ?? '',
            d.altitude ?? '',
            d.device || 'ESP32-S3',
            d.status ?? '',
            d.source || (d.ml_mode ? 'ML_Prediction' : 'Sensor'),
        ])

        // Build CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map((row) =>
                row.map((cell: any) => {
                    const str = String(cell)
                    // Escape commas and quotes
                    if (str.includes(',') || str.includes('"')) {
                        return `"${str.replace(/"/g, '""')}"`
                    }
                    return str
                }).join(',')
            ),
        ].join('\n')

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const now = new Date()
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`

        link.href = url
        link.download = `cleankiln-dt-sensor-data_${dateStr}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }, [history])

    const exportJSON = useCallback(() => {
        if (history.length === 0) return

        const exportData = {
            exported_at: new Date().toISOString(),
            device: sensorData?.device || 'ESP32-S3',
            data_points: history.length,
            readings: history,
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const now = new Date()
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`

        link.href = url
        link.download = `cleankiln-dt-sensor-data_${dateStr}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }, [history, sensorData])

    const hasData = history.length > 0

    return (
        <div className="glass-card p-6 mb-6 animate-slideUp delay-600">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <span className="text-base">📥</span>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">Data Export</h3>
                    <p className="text-[11px] text-slate-500">
                        Download {history.length} data point{history.length !== 1 ? 's' : ''} from this session
                    </p>
                </div>
            </div>

            {/* Export Buttons */}
            <div className="grid grid-cols-2 gap-3">
                {/* CSV Export */}
                <button
                    onClick={exportCSV}
                    disabled={!hasData}
                    className={`group rounded-xl p-4 text-center transition-all duration-300 border ${hasData
                            ? 'bg-white/[0.03] border-white/[0.06] hover:bg-emerald-500/10 hover:border-emerald-500/20 cursor-pointer'
                            : 'bg-white/[0.02] border-white/[0.04] opacity-50 cursor-not-allowed'
                        }`}
                >
                    <div className="text-2xl mb-1.5">📄</div>
                    <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors duration-200">
                        Export CSV
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Spreadsheet format</div>
                </button>

                {/* JSON Export */}
                <button
                    onClick={exportJSON}
                    disabled={!hasData}
                    className={`group rounded-xl p-4 text-center transition-all duration-300 border ${hasData
                            ? 'bg-white/[0.03] border-white/[0.06] hover:bg-violet-500/10 hover:border-violet-500/20 cursor-pointer'
                            : 'bg-white/[0.02] border-white/[0.04] opacity-50 cursor-not-allowed'
                        }`}
                >
                    <div className="text-2xl mb-1.5">📋</div>
                    <div className="text-sm font-semibold text-white group-hover:text-violet-400 transition-colors duration-200">
                        Export JSON
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Raw data format</div>
                </button>
            </div>

            {/* Info */}
            {!hasData && (
                <p className="text-[10px] text-slate-600 text-center mt-3">
                    Waiting for sensor data to export...
                </p>
            )}
        </div>
    )
}
