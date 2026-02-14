interface DeviceInfoProps {
  sensorData: any
}

interface InfoItemProps {
  label: string
  value: React.ReactNode
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-4 text-center hover:bg-white/[0.06] transition-colors duration-300">
      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  )
}

export default function DeviceInfo({ sensorData }: DeviceInfoProps) {
  return (
    <div className="glass-card p-6 animate-slideUp delay-500">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <span className="text-base">📡</span>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Device Information</h2>
          <p className="text-[11px] text-slate-500">ESP32-S3 Hardware Details</p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <InfoItem
          label="Device"
          value={sensorData?.device || 'ESP32-S3'}
        />
        <InfoItem
          label="WiFi Signal"
          value={sensorData?.rssi != null && sensorData.rssi !== 0 ? `${sensorData.rssi} dBm` : sensorData?.wifi_status === 'Connected' ? 'Connected' : '--'}
        />
        <InfoItem
          label="eCO2"
          value={sensorData?.eco2 ? `${sensorData.eco2} ppm` : '--'}
        />
        <InfoItem
          label="H2"
          value={sensorData?.h2 ? sensorData.h2.toLocaleString() : '--'}
        />
        <InfoItem
          label="Ethanol"
          value={sensorData?.ethanol ? sensorData.ethanol.toLocaleString() : '--'}
        />
        <InfoItem
          label="Relay State"
          value={
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${sensorData?.relay_state === 'ON'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                }`}
            >
              {sensorData?.relay_state || 'OFF'}
            </span>
          }
        />
        <InfoItem
          label="Free Heap"
          value={sensorData?.heap ? `${(sensorData.heap / 1024).toFixed(1)} KB` : '--'}
        />
        <InfoItem
          label="Data Source"
          value={
            sensorData?.ml_mode ? (
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/20">
                🤖 ML
              </span>
            ) : (
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                📡 Sensor
              </span>
            )
          }
        />
        <InfoItem
          label="WiFi Status"
          value={
            sensorData?.wifi_status === 'Connected' ? (
              <span className="text-emerald-400 font-semibold">● Online</span>
            ) : (
              <span className="text-amber-400 font-semibold">○ Offline</span>
            )
          }
        />
        <InfoItem
          label="Altitude"
          value={sensorData?.altitude != null ? `${sensorData.altitude.toFixed(1)} m` : '--'}
        />
      </div>
    </div>
  )
}
