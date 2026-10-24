'use client'

import * as React from 'react'
import type { EnvironmentContext, OperatingSystem } from '@/types/diagnostic'
import { Apple, Monitor, Terminal, Wand2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnvironmentSelectorProps {
  value: EnvironmentContext
  onChange: (env: EnvironmentContext) => void
  autoDetect: boolean
  onAutoDetectToggle: (enabled: boolean) => void
}

const OS_OPTIONS: { id: OperatingSystem; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'macos', label: 'macOS', icon: Apple },
  { id: 'linux', label: 'Linux', icon: Terminal },
  { id: 'windows', label: 'Windows', icon: Monitor },
]

const RUNTIMES = [
  { id: 'node', label: 'Node.js', defaultVersion: 'v20.11' },
  { id: 'python', label: 'Python', defaultVersion: '3.11' },
  { id: 'docker', label: 'Docker', defaultVersion: '24.0' },
  { id: 'rust', label: 'Rust/Cargo', defaultVersion: '1.77' },
  { id: 'go', label: 'Go', defaultVersion: '1.22' },
  { id: 'ruby', label: 'Ruby/Gems', defaultVersion: '3.2' },
]

export function EnvironmentSelector({
  value,
  onChange,
  autoDetect,
  onAutoDetectToggle,
}: EnvironmentSelectorProps) {
  function handleOsSelect(os: OperatingSystem) {
    onChange({
      ...value,
      os,
    })
  }

  function handleRuntimeSelect(runtime: string, defaultVer: string) {
    onChange({
      ...value,
      runtime,
      version: value.version || defaultVer,
    })
  }

  function handleVersionChange(version: string) {
    onChange({
      ...value,
      version,
    })
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
            <Terminal className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Target Environment</h3>
        </div>

        <button
          type="button"
          onClick={() => onAutoDetectToggle(!autoDetect)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
            autoDetect
              ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
              : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
          )}
          title="Detect OS and package manager automatically from error logs"
        >
          <Wand2 className="h-3 w-3" />
          <span>Auto-detect</span>
          {autoDetect && <Check className="h-3 w-3" />}
        </button>
      </div>

      {/* OS Selectors */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Operating System</label>
        <div className="grid grid-cols-3 gap-2">
          {OS_OPTIONS.map((item) => {
            const Icon = item.icon
            const isSelected = value.os === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOsSelect(item.id)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                  isSelected
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-sm shadow-emerald-950/40 ring-1 ring-emerald-500/20'
                    : 'border-zinc-800/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isSelected ? 'text-emerald-400' : 'text-zinc-400')} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Runtime Pills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Runtime / Toolchain</label>
          <span className="text-[10px] text-zinc-400 font-mono">Current: {value.runtime}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RUNTIMES.map((r) => {
            const isSelected = value.runtime.toLowerCase() === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRuntimeSelect(r.id, r.defaultVersion)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-mono transition-all',
                  isSelected
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'border-zinc-800/80 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                )}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Version Input */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Runtime Version (Optional)
        </label>
        <div className="relative">
          <input
            type="text"
            value={value.version || ''}
            onChange={(e) => handleVersionChange(e.target.value)}
            placeholder="e.g. v20.11.0, 3.11.4, latest"
            className="w-full rounded-lg border border-zinc-800/90 bg-zinc-950/80 px-3 py-1.5 font-mono text-xs text-zinc-200 placeholder:text-zinc-400 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
      </div>
    </div>
  )
}
