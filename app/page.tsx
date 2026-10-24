'use client'

import * as React from 'react'
import Link from 'next/link'
import { InputForm, SAMPLE_PRESETS } from '@/components/diagnostic/InputForm'
import { ResolutionView } from '@/components/diagnostic/ResolutionView'
import { LoadingSkeleton } from '@/components/diagnostic/LoadingSkeleton'
import { AiModelSettings } from '@/components/diagnostic/AiModelSettings'
import type { DiagnosticResult, EnvironmentContext, AiConfig } from '@/types/diagnostic'
import { saveDiagnosis } from '@/lib/db/diagnoses'
import { uploadErrorScreenshot } from '@/lib/storage/upload'
import {
  Terminal,
  History,
  Sparkles,
  Command,
  ShieldCheck,
  Zap,
  ArrowRight,
  Code2,
  Cpu,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type DiagnosticState = 'idle' | 'loading' | 'completed'

export default function SetupMedicDashboard() {
  const [diagnosticState, setDiagnosticState] = React.useState<DiagnosticState>('completed')
  const [rawLog, setRawLog] = React.useState(SAMPLE_PRESETS[0].log)
  const [environment, setEnvironment] = React.useState<EnvironmentContext>({
    os: 'macos',
    runtime: 'node',
    version: '20.11.0',
  })
  const [aiConfig, setAiConfig] = React.useState<AiConfig>({
    provider: 'gemma-google',
  })
  const [screenshotFile, setScreenshotFile] = React.useState<File | null>(null)
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = React.useState<string | null>(null)
  const [diagnosis, setDiagnosis] = React.useState<DiagnosticResult | null>(null)
  const [isSaved, setIsSaved] = React.useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false)

  // Load saved AI config from localStorage
  React.useEffect(() => {
    try {
      const savedKeys = localStorage.getItem('setupmedic_ai_keys')
      const savedProvider = localStorage.getItem('setupmedic_ai_provider')
      if (savedKeys || savedProvider) {
        const parsed = savedKeys ? JSON.parse(savedKeys) : {}
        const provider = (savedProvider as any) || 'gemma-google'
        let customApiKey: string | undefined = undefined
        if (provider === 'gemma-google' || provider === 'gemini') {
          customApiKey = parsed.googleKey
        } else if (provider === 'gemma-groq') {
          customApiKey = parsed.groqKey
        }
        setAiConfig({
          provider,
          customApiKey,
          ollamaBaseUrl: parsed.ollamaUrl || 'http://localhost:11434',
        })
      }
    } catch {
      // ignore
    }
  }, [])

  // Initial load: populate with default diagnosis
  React.useEffect(() => {
    handleRunInitialDiagnostic()
  }, [])

  // Screenshot preview handling
  React.useEffect(() => {
    if (!screenshotFile) {
      setScreenshotPreviewUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(screenshotFile)
    setScreenshotPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [screenshotFile])

  // Global hotkeys: Cmd+Enter to diagnose, Cmd+K to open Command Palette
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleDiagnose()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [rawLog, environment, screenshotFile, diagnosticState, aiConfig])

  async function handleRunInitialDiagnostic() {
    setDiagnosticState('loading')
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawLog: SAMPLE_PRESETS[0].log,
          environment: { os: 'macos', runtime: 'node', version: '20.11.0' },
          aiConfig,
        }),
      })

      if (res.ok) {
        const json = await res.json()
        setDiagnosis(json.data)
        setDiagnosticState('completed')
      } else {
        setDiagnosticState('idle')
      }
    } catch {
      setDiagnosticState('idle')
    }
  }

  async function handleDiagnose() {
    if (!rawLog.trim() || diagnosticState === 'loading') return

    setDiagnosticState('loading')
    setIsSaved(false)

    try {
      let uploadedScreenshotUrl: string | undefined = undefined

      if (screenshotFile) {
        try {
          uploadedScreenshotUrl = await uploadErrorScreenshot(screenshotFile)
        } catch (err) {
          console.warn('Screenshot upload fallback:', err)
        }
      }

      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawLog,
          environment,
          screenshotUrl: uploadedScreenshotUrl,
          aiConfig,
        }),
      })

      if (!response.ok) {
        const errJson = await response.json()
        throw new Error(errJson.error || errJson.message || 'Failed to diagnose setup error')
      }

      const json = await response.json()
      const result: DiagnosticResult = json.data

      setDiagnosis(result)
      setDiagnosticState('completed')

      // Automatically persist to Supabase / local storage history
      await saveDiagnosis('guest', {
        rawLog,
        environment,
        result,
        screenshotUrl: uploadedScreenshotUrl,
      })
      setIsSaved(true)

      const engineName = result.modelUsed || 'Gemma 2 AI'
      toast.success('Diagnosis Complete!', {
        description: `Diagnosed via ${engineName}. Saved to history.`,
      })
    } catch (err: any) {
      console.error(err)
      toast.error('Diagnostic error', {
        description: err?.message || 'Could not parse error log. Please verify input.',
      })
      setDiagnosticState('idle')
    }
  }

  async function handleManualSave() {
    if (!diagnosis) return
    await saveDiagnosis('guest', {
      rawLog,
      environment,
      result: diagnosis,
    })
    setIsSaved(true)
    toast.success('Saved to History', {
      description: diagnosis.title,
    })
  }

  function handleClear() {
    setRawLog('')
    setScreenshotFile(null)
    setDiagnosis(null)
    setDiagnosticState('idle')
    setIsSaved(false)
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      {/* Dynamic ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[450px] bg-[radial-gradient(60%_100%_at_50%_0%,oklch(0.765_0.177_163.223/0.12),transparent)]"
      />

      {/* Top Application Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-zinc-950 shadow-md shadow-emerald-500/20">
              <Terminal className="h-5 w-5 font-bold" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-zinc-100">
                  SetupMedic
                </span>
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                  AI v2.4
                </span>
              </div>
              <p className="hidden text-[11px] text-zinc-400 sm:block">
                AI Diagnostic & Recovery Engine for Terminal Errors
              </p>
            </div>
          </div>

          {/* Action Header Nav */}
          <div className="flex items-center gap-3">
            {/* AI Engine Selector & Keys Settings */}
            <AiModelSettings
              config={aiConfig}
              onChange={(newCfg) => {
                setAiConfig(newCfg)
                try {
                  localStorage.setItem('setupmedic_ai_provider', newCfg.provider)
                } catch {}
              }}
            />

            {/* Quick Command Palette Button */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
            >
              <Command className="h-3.5 w-3.5 text-zinc-400" />
              <span>Quick Actions</span>
              <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                ⌘K
              </kbd>
            </button>

            {/* Link to Saved Solutions History */}
            <Link
              href="/history"
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-emerald-500/40 hover:bg-zinc-800 hover:text-white"
            >
              <History className="h-3.5 w-3.5 text-emerald-400" />
              <span>Saved Solutions</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Workspace */}
      <main className="relative mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 items-start gap-6 px-4 py-6 lg:grid-cols-2 lg:px-6">
        {/* Left Side: Error Input Form */}
        <section aria-label="Error Input Console" className="w-full">
          <InputForm
            rawLog={rawLog}
            onLogChange={setRawLog}
            environment={environment}
            onEnvironmentChange={setEnvironment}
            screenshotFile={screenshotFile}
            screenshotPreviewUrl={screenshotPreviewUrl}
            onScreenshotChange={setScreenshotFile}
            onSubmit={handleDiagnose}
            onClear={handleClear}
            isLoading={diagnosticState === 'loading'}
            activeEngineName={
              aiConfig.provider === 'gemma-google'
                ? 'Gemma 2 (Google AI)'
                : aiConfig.provider === 'gemma-groq'
                ? 'Gemma 2 (Groq Fast)'
                : aiConfig.provider === 'gemma-ollama'
                ? 'Gemma 2 (Ollama)'
                : aiConfig.provider === 'offline'
                ? 'Offline Engine'
                : 'Gemma 2 AI'
            }
          />
        </section>

        {/* Right Side: Resolution View / Loading Skeleton / Idle Card */}
        <section aria-label="Diagnostic Resolution Console" className="w-full">
          {diagnosticState === 'loading' && <LoadingSkeleton />}

          {diagnosticState === 'completed' && diagnosis && (
            <ResolutionView
              diagnosis={diagnosis}
              isSaved={isSaved}
              onSave={handleManualSave}
              onReDiagnose={handleDiagnose}
            />
          )}

          {diagnosticState === 'idle' && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-12 text-center shadow-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800">
                <Terminal className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-200">
                Awaiting Terminal Error Log
              </h3>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-400">
                Paste an installation failure, dependency conflict, or build stack trace on the left, or choose a sample preset to test the AI diagnostic engine.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SAMPLE_PRESETS.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setRawLog(p.log)
                      setEnvironment({ os: p.os, runtime: p.runtime })
                      handleDiagnose()
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300"
                  >
                    <Zap className="h-3 w-3 text-emerald-400" />
                    <span>Run “{p.label}”</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Command Palette Modal (Cmd + K) */}
      <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <DialogContent className="max-w-lg border-zinc-800 bg-zinc-950 p-5 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Command className="h-4 w-4 text-emerald-400" /> Quick Command Palette
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Jump to past solutions or load instant error test scenarios
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Navigation
            </div>
            <Link
              href="/history"
              onClick={() => setCommandPaletteOpen(false)}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 text-xs text-zinc-200 hover:border-emerald-500/40 hover:text-emerald-300"
            >
              <span className="flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-400" />
                View Saved Solutions History
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
            </Link>

            <div className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Switch AI Diagnostic Engine
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAiConfig((prev) => ({ ...prev, provider: 'gemma-google' }))
                  setCommandPaletteOpen(false)
                  toast.success('Switched to Gemma 2 (Google AI)')
                }}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-left text-xs text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Gemma 2 (Google)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiConfig((prev) => ({ ...prev, provider: 'gemma-groq' }))
                  setCommandPaletteOpen(false)
                  toast.success('Switched to Gemma 2 (Groq Fast)')
                }}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-left text-xs text-zinc-300 hover:border-amber-500/40 hover:text-amber-300"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Gemma 2 (Groq)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiConfig((prev) => ({ ...prev, provider: 'gemma-ollama' }))
                  setCommandPaletteOpen(false)
                  toast.success('Switched to Gemma 2 (Local Ollama)')
                }}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-left text-xs text-zinc-300 hover:border-cyan-500/40 hover:text-cyan-300"
              >
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                <span>Gemma 2 (Ollama)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiConfig((prev) => ({ ...prev, provider: 'offline' }))
                  setCommandPaletteOpen(false)
                  toast.success('Switched to Offline Rule Engine')
                }}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-left text-xs text-zinc-300 hover:border-zinc-700 hover:text-white"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
                <span>Offline Engine</span>
              </button>
            </div>

            <div className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Load Preset Error Traces
            </div>
            <div className="space-y-1.5">
              {SAMPLE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setRawLog(p.log)
                    setEnvironment({ os: p.os, runtime: p.runtime })
                    setCommandPaletteOpen(false)
                    toast.success(`Loaded ${p.label}`)
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2 text-left text-xs text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
                >
                  <div>
                    <span className="font-medium">{p.label}</span>
                    <span className="ml-2 font-mono text-[10px] text-zinc-400">
                      {p.os} · {p.runtime}
                    </span>
                  </div>
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
