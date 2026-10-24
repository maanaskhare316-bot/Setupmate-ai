'use client'

import { FileCog, ImageUp, Loader2, Sparkles, SquareTerminal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PRESET_LIST, PRESETS, type Environment, type PresetId, type Runtime } from '@/lib/diagnosis'
import { cn } from '@/lib/utils'
import { CodeEditor } from './code-editor'
import { ConfigFilePicker } from './config-file-picker'
import { ScreenshotDropzone } from './screenshot-dropzone'
import { EnvironmentToggles } from './environment-toggles'

export type InputMode = 'log' | 'screenshot' | 'config'

type ErrorInputCardProps = {
  mode: InputMode
  onModeChange: (mode: InputMode) => void
  activePreset: PresetId
  onLoadPreset: (id: PresetId) => void
  log: string
  onLogChange: (value: string) => void
  configFile: PresetId | null
  onConfigFileChange: (id: PresetId) => void
  screenshot: File | null
  onScreenshotChange: (file: File | null) => void
  env: Environment
  onEnvChange: (env: Environment) => void
  runtimes: Runtime[]
  onToggleRuntime: (runtime: Runtime) => void
  autoDetect: boolean
  onAutoDetectChange: (value: boolean) => void
  canDiagnose: boolean
  isDiagnosing: boolean
  onDiagnose: () => void
  onClear: () => void
}

export function ErrorInputCard(props: ErrorInputCardProps) {
  const lineCount = props.log.length === 0 ? 0 : props.log.split('\n').length
  const isPresetLog = props.log === PRESETS[props.activePreset].log

  return (
    <Card className="gap-0 border-border bg-card/70 py-0 shadow-2xl shadow-black/20 backdrop-blur lg:sticky lg:top-22">
      <Tabs value={props.mode} onValueChange={(value) => props.onModeChange(value as InputMode)}>
        <CardHeader className="gap-3 border-b border-border py-4">
          <div>
            <CardTitle className="text-base">Error Context &amp; Input</CardTitle>
            <CardDescription>Give SetupMedic the raw failure output and where it happened.</CardDescription>
          </div>
          <TabsList className="w-full">
            <TabsTrigger value="log">
              <SquareTerminal aria-hidden="true" />
              Terminal Log
            </TabsTrigger>
            <TabsTrigger value="screenshot">
              <ImageUp aria-hidden="true" />
              Screenshot
            </TabsTrigger>
            <TabsTrigger value="config">
              <FileCog aria-hidden="true" />
              Config File
            </TabsTrigger>
          </TabsList>
          <ul className="flex flex-wrap gap-1.5" aria-label="Sample error presets">
            {PRESET_LIST.map((preset) => {
              const active = isPresetLog && props.activePreset === preset.id && props.mode === 'log'
              return (
                <li key={preset.id}>
                  <button
                    type="button"
                    onClick={() => props.onLoadPreset(preset.id)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      active
                        ? 'border-primary/50 bg-primary/10 text-primary shadow-[0_0_14px_-6px_var(--color-primary)]'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                    )}
                  >
                    <span className="text-muted-foreground/70">Try:</span> {preset.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </CardHeader>

        <CardContent className="flex flex-col gap-5 py-5">
          <TabsContent value="log" className="flex flex-col gap-2">
            <CodeEditor
              value={props.log}
              onChange={props.onLogChange}
              fileName={isPresetLog ? PRESETS[props.activePreset].logFile : 'terminal.log'}
            />
            <p className="self-end font-mono text-[11px] text-muted-foreground">
              {lineCount} {lineCount === 1 ? 'line' : 'lines'} · {props.log.length.toLocaleString()} chars
            </p>
          </TabsContent>
          <TabsContent value="screenshot">
            <ScreenshotDropzone file={props.screenshot} onChange={props.onScreenshotChange} />
          </TabsContent>
          <TabsContent value="config">
            <ConfigFilePicker value={props.configFile} onChange={props.onConfigFileChange} />
          </TabsContent>

          <EnvironmentToggles
            env={props.env}
            onEnvChange={props.onEnvChange}
            runtimes={props.runtimes}
            onToggleRuntime={props.onToggleRuntime}
            autoDetect={props.autoDetect}
          />
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t border-border bg-muted/20 py-4 sm:flex-row sm:items-center">
          <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-start">
            <Button variant="ghost" size="sm" onClick={props.onClear} className="text-muted-foreground">
              <Trash2 aria-hidden="true" />
              Clear Input
            </Button>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={props.autoDetect} onCheckedChange={props.onAutoDetectChange} />
              Auto-detect OS
            </label>
          </div>
          <Button
            size="lg"
            className="group h-11 w-full justify-between gap-3 px-4 text-sm font-semibold shadow-[0_0_28px_-8px_var(--color-primary)] transition-all hover:shadow-[0_0_34px_-6px_var(--color-primary)] active:scale-[0.99] sm:ml-auto sm:w-auto"
            onClick={props.onDiagnose}
            disabled={!props.canDiagnose || props.isDiagnosing}
          >
            <span className="flex items-center gap-2">
              {props.isDiagnosing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="size-4 transition-transform group-hover:rotate-12" aria-hidden="true" />
              )}
              {props.isDiagnosing ? 'Analyzing…' : 'Diagnose & Generate Fix'}
            </span>
            <kbd className="flex items-center gap-1 rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 py-0.5 font-mono text-[11px] font-medium">
              <span aria-hidden="true" className="[font-family:system-ui]">⌘</span>
              <span className="sr-only">Command</span>+ Enter
            </kbd>
          </Button>
        </CardFooter>
      </Tabs>
    </Card>
  )
}
