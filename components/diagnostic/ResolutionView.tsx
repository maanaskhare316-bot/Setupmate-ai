'use client'

import * as React from 'react'
import type { DiagnosticResult, DiagnosticStep, RiskLevel, SeverityLevel } from '@/types/diagnostic'
import {
  Check,
  Copy,
  Terminal,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Play,
  RotateCcw,
  Bookmark,
  BookmarkCheck,
  FileCode,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ResolutionViewProps {
  diagnosis: DiagnosticResult
  isSaved?: boolean
  onSave?: () => void
  onReDiagnose?: () => void
}

export function ResolutionView({
  diagnosis,
  isSaved = false,
  onSave,
  onReDiagnose,
}: ResolutionViewProps) {
  const [copiedStepId, setCopiedStepId] = React.useState<number | null>(null)
  const [copiedMaster, setCopiedMaster] = React.useState(false)
  const [copiedVerification, setCopiedVerification] = React.useState(false)

  // Simulation State
  const [isSimulating, setIsSimulating] = React.useState(false)
  const [simulationLogs, setSimulationLogs] = React.useState<string[]>([])
  const [simulationComplete, setSimulationComplete] = React.useState(false)

  // Copy single step command
  async function handleCopyStep(step: DiagnosticStep) {
    try {
      await navigator.clipboard.writeText(step.command)
      setCopiedStepId(step.id)
      toast.success(`Copied Step ${step.id} command`, {
        description: step.command,
      })
      setTimeout(() => setCopiedStepId(null), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  // Copy verification command
  async function handleCopyVerification() {
    try {
      await navigator.clipboard.writeText(diagnosis.verificationCommand)
      setCopiedVerification(true)
      toast.success('Copied verification command', {
        description: diagnosis.verificationCommand,
      })
      setTimeout(() => setCopiedVerification(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  // Copy All Fix Steps master button
  async function handleCopyAllSteps() {
    try {
      const isWindows = diagnosis.environment?.os === 'windows'
      let script = ''

      if (isWindows) {
        script = `# SetupMedic Fix Script for Windows (${diagnosis.packageName || 'Setup'})\n`
        script += `# ${diagnosis.title}\n\n`
        diagnosis.steps.forEach((s) => {
          script += `# Step ${s.id}: ${s.title}\n`
          script += `${s.command}\n\n`
        })
        script += `# Verification Step\n${diagnosis.verificationCommand}\n`
      } else {
        script = `#!/usr/bin/env bash\n# SetupMedic Fix Script for ${diagnosis.environment?.os || 'Unix'}\n`
        script += `# ${diagnosis.title}\nset -e\n\n`
        diagnosis.steps.forEach((s) => {
          script += `# Step ${s.id}: ${s.title}\n`
          script += `${s.command}\n\n`
        })
        script += `# Verification Step\necho "Running verification test..."\n${diagnosis.verificationCommand}\necho "SetupMedic fix completed successfully!"\n`
      }

      await navigator.clipboard.writeText(script)
      setCopiedMaster(true)
      toast.success('Copied all fix steps as script', {
        description: `Exported ${diagnosis.steps.length} commands ready for execution.`,
      })
      setTimeout(() => setCopiedMaster(false), 2500)
    } catch {
      toast.error('Failed to copy script block')
    }
  }

  // Run dry-run simulation
  function handleSimulateRun() {
    setIsSimulating(true)
    setSimulationLogs([])
    setSimulationComplete(false)

    const initial = [
      `[SetupMedic Simulator] Starting sandbox verification runner on ${diagnosis.environment?.os || 'host'}...`,
      `[INIT] Validating toolchain bindings for ${diagnosis.packageName || 'runtime'}...`,
    ]
    setSimulationLogs(initial)

    // Sequence simulated steps
    diagnosis.steps.forEach((step, index) => {
      setTimeout(() => {
        setSimulationLogs((prev) => [
          ...prev,
          `$ ${step.command}`,
          `  ↳ [OK] ${step.title} executed (sandbox exit: 0)`,
        ])
      }, (index + 1) * 750)
    })

    // Verification step
    const verifDelay = (diagnosis.steps.length + 1) * 750
    setTimeout(() => {
      setSimulationLogs((prev) => [
        ...prev,
        `$ ${diagnosis.verificationCommand}`,
        `  ↳ [PASS] Verification assertion matched! Output stream healthy.`,
        `[SUCCESS] SetupMedic Verification Succeeded! All checks green (exit code 0).`,
      ])
      setIsSimulating(false)
      setSimulationComplete(true)
      toast.success('Simulation verified successfully!', {
        description: 'Dry-run completed with zero errors.',
      })
    }, verifDelay)
  }

  function getSeverityBadge(severity: SeverityLevel) {
    switch (severity) {
      case 'critical':
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400">
            <ShieldAlert className="h-3 w-3" />
            <span>Critical Error</span>
          </span>
        )
      case 'warning':
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            <span>Warning</span>
          </span>
        )
      case 'info':
      default:
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-400">
            <Info className="h-3 w-3" />
            <span>Notice</span>
          </span>
        )
    }
  }

  function getRiskBadge(risk: RiskLevel) {
    switch (risk) {
      case 'high':
        return (
          <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400">
            High Risk (Modifies System)
          </span>
        )
      case 'moderate':
        return (
          <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            Moderate Risk (sudo/PATH)
          </span>
        )
      case 'safe':
      default:
        return (
          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            Safe Command
          </span>
        )
    }
  }

  return (
    <div className="flex flex-col space-y-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-md">
      {/* Header Info */}
      <div className="space-y-3 border-b border-zinc-800/80 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {getSeverityBadge(diagnosis.severity)}
            {diagnosis.packageName && (
              <span className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 font-mono text-xs text-zinc-300">
                {diagnosis.packageName}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-400">
              <Sparkles className="h-3 w-3" />
              <span>{diagnosis.confidenceScore}% confidence</span>
            </span>
            {diagnosis.modelUsed && (
              <span className="flex items-center gap-1 rounded-md border border-purple-500/25 bg-purple-500/10 px-2 py-0.5 font-mono text-xs text-purple-300">
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span>{diagnosis.modelUsed}</span>
              </span>
            )}
            {diagnosis.executionTimeMs !== undefined && (
              <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                ⚡ {diagnosis.executionTimeMs}ms
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                  isSaved
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white'
                )}
              >
                {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Bookmark className="h-3.5 w-3.5 text-zinc-400" />}
                <span>{isSaved ? 'Saved to History' : 'Save Solution'}</span>
              </button>
            )}

            {onReDiagnose && (
              <button
                type="button"
                onClick={onReDiagnose}
                className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                title="Re-run diagnostic analysis"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
          {diagnosis.title}
        </h2>
      </div>

      {/* Root Cause Card */}
      <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <Info className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Root Cause Analysis
            </h3>
            <p className="text-sm leading-relaxed text-zinc-200">
              {diagnosis.rootCause}
            </p>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-200">
              Prescribed Fix Steps ({diagnosis.steps.length})
            </h3>
          </div>

          <button
            type="button"
            onClick={handleCopyAllSteps}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
              copiedMaster
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700 hover:text-white'
            )}
          >
            {copiedMaster ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <FileCode className="h-3.5 w-3.5 text-zinc-400" />}
            <span>{copiedMaster ? 'Script Copied!' : 'Copy All Fix Steps'}</span>
          </button>
        </div>

        <div className="space-y-3">
          {diagnosis.steps.map((step) => {
            const isCopied = copiedStepId === step.id
            return (
              <div
                key={step.id}
                className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700/80"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs font-mono font-semibold text-zinc-300">
                      {step.id}
                    </span>
                    <h4 className="text-xs font-semibold text-zinc-200">{step.title}</h4>
                  </div>
                  {getRiskBadge(step.riskLevel)}
                </div>

                {/* Command Shell Box */}
                <div className="relative mt-1 flex items-center justify-between rounded-lg border border-zinc-800/90 bg-zinc-950 px-3.5 py-2.5 font-mono text-xs text-emerald-300 shadow-inner">
                  <span className="mr-2 select-none text-zinc-600">$</span>
                  <code className="flex-1 overflow-x-auto text-zinc-100 selection:bg-emerald-500/30">
                    {step.command}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyStep(step)}
                    className={cn(
                      'ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-all',
                      isCopied
                        ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    )}
                    title="Copy command"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Why run this */}
                <p className="mt-2 text-xs text-zinc-400 leading-normal">
                  <span className="font-semibold text-zinc-400">Why run this: </span>
                  {step.whyRunThis}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Verification Check Card */}
      <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Verification Check
              </h3>
              <p className="text-[11px] text-zinc-400">Run this to confirm the error is fully resolved</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateRun}
              disabled={isSimulating}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all shadow-sm',
                simulationComplete
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                  : 'border-emerald-500/40 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
              )}
            >
              <Play className={cn('h-3.5 w-3.5', isSimulating && 'animate-spin')} />
              <span>{isSimulating ? 'Simulating...' : simulationComplete ? 'Re-simulate' : 'Simulate Run'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyVerification}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border transition-all',
                copiedVerification
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                  : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              )}
              title="Copy verification command"
            >
              {copiedVerification ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Verification Command Box */}
        <div className="mt-3 flex items-center rounded-lg border border-zinc-800/90 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200">
          <span className="mr-2 select-none text-zinc-600">$</span>
          <code className="flex-1 overflow-x-auto text-emerald-400">
            {diagnosis.verificationCommand}
          </code>
        </div>

        {/* Simulation Output Drawer */}
        {(isSimulating || simulationLogs.length > 0) && (
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Dry-Run Sandbox Terminal
              </span>
              <span>exit: {simulationComplete ? '0 (Success)' : 'running...'}</span>
            </div>

            <div className="mt-2.5 max-h-48 space-y-1 overflow-y-auto text-[11px] leading-relaxed">
              {simulationLogs.map((logLine, idx) => (
                <div
                  key={idx}
                  className={cn(
                    logLine.startsWith('$')
                      ? 'text-zinc-300 font-semibold'
                      : logLine.includes('[SUCCESS]') || logLine.includes('[PASS]') || logLine.includes('[OK]')
                      ? 'text-emerald-400'
                      : 'text-zinc-400'
                  )}
                >
                  {logLine}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
