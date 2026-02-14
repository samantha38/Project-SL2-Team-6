interface AIAnalysisProps {
  aiAnalysis: string | null
}

export default function AIAnalysis({ aiAnalysis }: AIAnalysisProps) {
  return (
    <div className="glass-card relative overflow-hidden mb-6 animate-slideUp delay-400">
      {/* Animated gradient border top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-violet-400 to-rose-400 animate-shimmer" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center border border-white/[0.06]">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">AI Analysis</h2>
            <p className="text-[11px] text-slate-500">
              Powered by Llama 3.3 · Auto-updates every 5 min
            </p>
          </div>
          <div className="ml-auto">
            <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Industrial Expert
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-5">
          {!aiAnalysis ? (
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-sm text-slate-500 italic">
                Waiting for sensor data to analyze...
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-300 leading-relaxed">
              {aiAnalysis}
            </p>
          )}
        </div>

        {/* Footer */}
        {aiAnalysis && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-600 uppercase tracking-widest">Active</span>
            </div>
            <span className="text-[10px] text-slate-600">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
