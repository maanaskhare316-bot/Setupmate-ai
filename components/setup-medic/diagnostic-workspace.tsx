'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  buildDiagnosis,
  detectEnvironment,
  detectPreset,
  INITIAL_SAVED,
  PRESETS,
  saveDiagnosis,
  type Diagnosis,
  type Environment,
  type PresetId,
  type Runtime,
  type SavedSolution,
} from '@/lib/diagnosis'
import { AppHeader } from './app-header'
import { ErrorInputCard, type InputMode } from './error-input-card'
import { DiagnosisPanel, type PanelView } from './diagnosis-panel'

const DIAGNOSE_DELAY_MS = 1600
const DEFAULT_PRESET: PresetId = 'node-gyp'

export function DiagnosticWorkspace() {
  const [mode, setMode] = useState<InputMode>('log')
  const [presetId, setPresetId] = useState<PresetId>(DEFAULT_PRESET)
  const [log, setLog] = useState(PRESETS[DEFAULT_PRESET].log)
  const [configFile, setConfigFile] = useState<PresetId | null>(DEFAULT_PRESET)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [env, setEnv] = useState<Environment>(PRESETS[DEFAULT_PRESET].env)
  const [runtimes, setRuntimes] = useState<Runtime[]>(PRESETS[DEFAULT_PRESET].runtimes)
  const [autoDetect, setAutoDetect] = useState(true)
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(() =>
    buildDiagnosis(DEFAULT_PRESET, PRESETS[DEFAULT_PRESET].env),
  )
  const [isDiagnosing, setIsDiagnosing] = useState(false)
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedSolution[]>(INITIAL_SAVED)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const hasInput =
    (mode === 'log' && log.trim().length > 0) ||
    (mode === 'config' && configFile !== null) ||
    (mode === 'screenshot' && screenshot !== null)

  function run(target: PresetId, targetEnv: Environment, alternative = false) {
    clearTimeout(timer.current)
    setIsDiagnosing(true)
    timer.current = setTimeout(() => {
      setDiagnosis(buildDiagnosis(target, targetEnv, alternative))
      setIsDiagnosing(false)
    }, DIAGNOSE_DELAY_MS)
  }

  function currentTarget(): PresetId {
    if (mode === 'config' && configFile) return configFile
    if (mode === 'log') return detectPreset(log) ?? presetId
    return presetId
  }

  function diagnose() {
    if (!hasInput || isDiagnosing) return
    run(currentTarget(), env)
  }

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      diagnose()
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [])

  function updateLog(value: string) {
    setLog(value)
    if (!autoDetect) return
    const detected = detectEnvironment(value)
    if (detected) setEnv((current) => ({ os: detected.os, arch: detected.os === 'macos' ? detected.arch : current.arch }))
  }

  function loadPreset(id: PresetId) {
    const preset = PRESETS[id]
    setPresetId(id)
    setMode('log')
    setLog(preset.log)
    setConfigFile(id)
    setEnv(preset.env)
    setRuntimes(preset.runtimes)
    return preset
  }

  function handleLoadPreset(id: PresetId) {
    const preset = loadPreset(id)
    toast(`Loaded “${preset.label}”`, { description: `${preset.logFile} · press ⌘ + Enter to diagnose` })
  }

  function handleLoadSaved(item: SavedSolution) {
    loadPreset(item.presetId)
    setEnv(item.env)
    run(item.presetId, item.env, item.alternative)
  }

  function handleSave() {
    if (!diagnosis) return
    if (saved.some((s) => s.id === diagnosis.id)) return
    setSaved((current) => [saveDiagnosis(diagnosis), ...current])
    toast.success('Saved to Saved Solutions', { description: diagnosis.label })
  }

  function handleClear() {
    clearTimeout(timer.current)
    setIsDiagnosing(false)
    setLog('')
    setScreenshot(null)
    setConfigFile(null)
  }

  function handleViewChange(view: PanelView) {
    if (view === 'empty') {
      clearTimeout(timer.current)
      setIsDiagnosing(false)
      setDiagnosis(null)
    } else if (view === 'analyzing') {
      run(currentTarget(), env)
    } else {
      clearTimeout(timer.current)
      setIsDiagnosing(false)
      setDiagnosis(buildDiagnosis(currentTarget(), env))
    }
  }

  function toggleRuntime(runtime: Runtime) {
    setRuntimes((current) =>
      current.includes(runtime) ? current.filter((r) => r !== runtime) : [...current, runtime],
    )
  }

  const view: PanelView = isDiagnosing ? 'analyzing' : diagnosis ? 'result' : 'empty'

  return (
    <>
      <AppHeader
        saved={saved}
        onLoadPreset={handleLoadPreset}
        onLoadSaved={handleLoadSaved}
        onRemoveSaved={(id) => setSaved((current) => current.filter((s) => s.id !== id))}
      />
      <main className="relative mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 items-start gap-6 px-4 py-6 lg:grid-cols-2 lg:px-6">
        <ErrorInputCard
          mode={mode}
          onModeChange={setMode}
          activePreset={presetId}
          onLoadPreset={loadPreset}
          log={log}
          onLogChange={updateLog}
          configFile={configFile}
          onConfigFileChange={setConfigFile}
          screenshot={screenshot}
          onScreenshotChange={setScreenshot}
          env={env}
          onEnvChange={setEnv}
          runtimes={runtimes}
          onToggleRuntime={toggleRuntime}
          autoDetect={autoDetect}
          onAutoDetectChange={(value) => {
            setAutoDetect(value)
            const detected = value ? detectEnvironment(log) : null
            if (detected) setEnv(detected)
          }}
          canDiagnose={hasInput}
          isDiagnosing={isDiagnosing}
          onDiagnose={diagnose}
          onClear={handleClear}
        />
        <DiagnosisPanel
          view={view}
          onViewChange={handleViewChange}
          diagnosis={diagnosis}
          isResolved={diagnosis !== null && resolvedId === diagnosis.id}
          isSaved={diagnosis !== null && saved.some((s) => s.id === diagnosis.id)}
          onResolve={() => {
            if (!diagnosis) return
            setResolvedId(diagnosis.id)
            toast.success('Marked as resolved', { description: 'This fix will rank higher for similar errors.' })
          }}
          onSave={handleSave}
          onAlternative={() => diagnosis && run(diagnosis.presetId, env, !diagnosis.alternative)}
        />
      </main>
    </>
  )
}
