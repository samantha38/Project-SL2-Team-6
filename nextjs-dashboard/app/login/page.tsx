'use client'

import { useState, FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login, isAuthenticated } = useAuth()
    const router = useRouter()

    // Redirect if already authenticated
    if (isAuthenticated) {
        router.push('/')
        return null
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const result = await login(username, password)

        if (result.success) {
            router.push('/')
        } else {
            setError(result.message || 'Login failed')
        }
        setLoading(false)
    }

    return (
        <main className="min-h-screen bg-surface bg-gradient-mesh flex items-center justify-center relative overflow-hidden">
            {/* Background decorative blurs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/[0.04] rounded-full blur-3xl" />
                <div className="absolute top-1/3 -right-40 w-96 h-96 bg-violet-500/[0.04] rounded-full blur-3xl" />
                <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-3xl" />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md px-4">
                {/* Logo / Title */}
                <div className="text-center mb-8 animate-slideUp">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/[0.08] mb-4">
                        <span className="text-3xl">🏭</span>
                    </div>
                    <h1 className="text-3xl font-bold gradient-text mb-1">CleanKiln DT</h1>
                    <p className="text-sm text-slate-500">Industrial Air Quality Monitoring</p>
                </div>

                {/* Form Card */}
                <div className="glass-card-strong p-8 animate-slideUp" style={{ animationDelay: '0.1s' }}>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                required
                                autoFocus
                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/[0.08] border border-rose-500/20">
                                <span className="text-sm">⚠️</span>
                                <p className="text-xs text-rose-400">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${loading
                                    ? 'bg-white/[0.06] text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:from-cyan-400 hover:to-violet-400 hover:shadow-glow-cyan active:scale-[0.98]'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                    Authenticating...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-[10px] text-slate-700 mt-6 animate-fadeIn">
                    CleanKiln DT v1.0 · ESP32-S3 Monitoring System · © 2026 SL2 Team 6
                </p>
            </div>
        </main>
    )
}
