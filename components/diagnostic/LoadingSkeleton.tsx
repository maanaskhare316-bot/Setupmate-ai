'use client'

import * as React from 'react'
import { Sparkles, Terminal, ShieldCheck, Cpu } from 'lucide-react'

export function LoadingSkeleton() {
  const [phase, setPhase] = React.useState(0)

  const phases = [
    'Parsing stack trace & symbol frames...',
    'Detecting operating system toolchain constraints...',
    'Filtering for non-destructive CLI recovery commands...',
    'Synthesizing verification command...',
  ]

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => (p + 1) % phases.length)
    }, 450)
    return () => clearInterval(interval)
  }, [phases.length])

  return (
    <div className="flex h-full flex-col justify-between space-y-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-md">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <Cpu className="h-5 w-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-zinc-100">SetupMedic AI Diagnostics Engine</h2>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-emerald-400">
                ACTIVE SCAN
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-400">{phases[phase]}</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs font-mono text-zinc-400">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
          <span>LLM Parser</span>
        </div>
      </div>

      {/* Pulsing Skeleton Diagnosis Card */}
      <div className="space-y-4">
        <div className="space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-800"></div>
            <div className="h-4 w-12 animate-pulse rounded bg-zinc-800"></div>
          </div>
          <div className="h-6 w-3/4 animate-pulse rounded-md bg-zinc-800"></div>
          <div className="space-y-1.5 pt-2">
            <div className="h-3 w-full animate-pulse rounded bg-zinc-800/60"></div>
            <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-800/60"></div>
          </div>
        </div>

        {/* Step Skeletons */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-800"></div>
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-800"></div>
          </div>

          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="relative overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-4"
            >
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 animate-pulse items-center justify-center rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
                    {idx}
                  </div>
                  <div className="h-4 w-40 animate-pulse rounded bg-zinc-800"></div>
                </div>
                <div className="h-4 w-14 animate-pulse rounded-full bg-zinc-800"></div>
              </div>

              <div className="mt-2 h-10 w-full animate-pulse rounded-lg border border-zinc-800/60 bg-zinc-950/80"></div>
              <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-zinc-800/50"></div>
            </div>
          ))}
        </div>

        {/* Verification Check Card Skeleton */}
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-zinc-400" />
              <div className="h-4 w-36 animate-pulse rounded bg-zinc-800"></div>
            </div>
            <div className="h-7 w-24 animate-pulse rounded-lg bg-zinc-800"></div>
          </div>
        </div>
      </div>

      {/* Terminal Pulse Footer */}
      <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
        <Terminal className="h-3.5 w-3.5 text-zinc-400" />
        <span>Evaluating sandbox exit conditions & safe shell flags...</span>
      </div>
    </div>
  )
}
