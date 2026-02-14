'use client'

import { useState, useCallback } from 'react'

interface PumpControlProps {
    isConnected: boolean
}

export default function PumpControl({ isConnected }: PumpControlProps) {
    const [pumpState, setPumpState] = useState<'ON' | 'OFF'>('OFF')
    const [loading, setLoading] = useState(false)
    const [lastAction, setLastAction] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const sendCommand = useCallback(async (action: 'POMPA_ON' | 'POMPA_OFF') => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('http://localhost:3000/api/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            })
            const data = await res.json()
            if (data.success) {
                setPumpState(action === 'POMPA_ON' ? 'ON' : 'OFF')
                setLastAction(`${action === 'POMPA_ON' ? 'ON' : 'OFF'} at ${new Date().toLocaleTimeString()}`)
            } else {
                setError('Command failed')
            }
        } catch (err) {
            setError('Connection error — is the server running?')
        } finally {
            setLoading(false)
        }
    }, [])

    const isOn = pumpState === 'ON'

    return (
        <div className="glass-card p-6 mb-6 animate-slideUp delay-600">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <span className="text-base">🔌</span>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">Pump Control</h3>
                    <p className="text-[11px] text-slate-500">Manual relay override</p>
                </div>
                <div className="ml-auto">
                    <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full border ${isOn
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-500/15 text-slate-400 border-slate-500/20'
                        }`}>
                        Pump {pumpState}
                    </span>
                </div>
            </div>

            {/* Control Panel */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                {/* ON Button */}
                <button
                    onClick={() => sendCommand('POMPA_ON')}
                    disabled={loading || !isConnected}
                    className={`relative group overflow-hidden rounded-xl p-4 text-center transition-all duration-300 border ${isOn
                            ? 'bg-emerald-500/15 border-emerald-500/30 shadow-glow-emerald'
                            : 'bg-white/[0.03] border-white/[0.06] hover:bg-emerald-500/10 hover:border-emerald-500/20'
                        } ${(loading || !isConnected) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <div className="text-2xl mb-1">💧</div>
                    <div className={`text-sm font-semibold ${isOn ? 'text-emerald-400' : 'text-slate-400'}`}>
                        Turn ON
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Start pumping</div>
                    {isOn && (
                        <div className="absolute top-2 right-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                        </div>
                    )}
                </button>

                {/* OFF Button */}
                <button
                    onClick={() => sendCommand('POMPA_OFF')}
                    disabled={loading || !isConnected}
                    className={`relative group overflow-hidden rounded-xl p-4 text-center transition-all duration-300 border ${!isOn
                            ? 'bg-rose-500/10 border-rose-500/20'
                            : 'bg-white/[0.03] border-white/[0.06] hover:bg-rose-500/10 hover:border-rose-500/20'
                        } ${(loading || !isConnected) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <div className="text-2xl mb-1">🛑</div>
                    <div className={`text-sm font-semibold ${!isOn ? 'text-rose-400' : 'text-slate-400'}`}>
                        Turn OFF
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Stop pumping</div>
                </button>
            </div>

            {/* Status */}
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="text-[10px] text-slate-500">
                            {!isConnected ? 'ESP32 offline — commands unavailable' : loading ? 'Sending command...' : 'Ready'}
                        </span>
                    </div>
                    {lastAction && (
                        <span className="text-[10px] text-slate-600">
                            Last: {lastAction}
                        </span>
                    )}
                </div>
                {error && (
                    <p className="text-[10px] text-rose-400 mt-2">⚠ {error}</p>
                )}
            </div>
        </div>
    )
}
