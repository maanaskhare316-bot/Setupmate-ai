'use client'

import * as React from 'react'
import type { EnvironmentContext, OperatingSystem, PresetError } from '@/types/diagnostic'
import { EnvironmentSelector } from './EnvironmentSelector'
import {
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Upload,
  X,
  FileCode2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export const SAMPLE_PRESETS: PresetError[] = [
  {
    id: 'node-gyp',
    label: 'node-gyp rebuild failed',
    runtime: 'node',
    os: 'macos',
    packageName: 'node-gyp',
    description: 'Python missing & Xcode CLI tools compiler failure',
    log: `gyp ERR! find Python 
gyp ERR! find Python Python is not set from command line or npm configuration
gyp ERR! find Python Python is not set from environment variable PYTHON
gyp ERR! find Python checking if "python3" can be used
gyp ERR! find Python - executable "python3" not found at ...
gyp ERR! find Python checking if "python" can be used
gyp ERR! find Python - executable "python" not found at ...
gyp ERR! find Python 
gyp ERR! find Python **********************************************************
gyp ERR! find Python You need to install the latest version of Python.
gyp ERR! find Python Node-gyp should be able to find and use Python. If not,
gyp ERR! find Python you can need to configure your environment.
gyp ERR! find Python **********************************************************
gyp ERR! configure error 
gyp ERR! stack Error: Could not find any Python installation to use
gyp ERR! System Darwin 23.4.0
gyp ERR! command "/usr/local/bin/node" "/usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js" "rebuild"`,
  },
  {
    id: 'pip-ssl',
    label: 'pip SSL cert verify failed',
    runtime: 'python',
    os: 'macos',
    packageName: 'pip / certifi',
    description: 'Missing root certificates & TLS handshake error',
    log: `pip install requests
WARNING: Retrying (Retry(total=4, connect=None, read=None, redirect=None, status=None)) after connection broken by 'SSLError(SSLCertVerificationError(1, "[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1007)"))': /simple/requests/
WARNING: Retrying (Retry(total=3...)) after connection broken by 'SSLError(...)': /simple/requests/
Could not fetch URL https://pypi.org/simple/requests/: There was a problem confirming the ssl certificate: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1007) - skipping
ERROR: Could not find a version that satisfies the requirement requests (from versions: none)
ERROR: No matching distribution found for requests`,
  },
  {
    id: 'docker-sock',
    label: 'Docker socket permission denied',
    runtime: 'docker',
    os: 'linux',
    packageName: 'docker-ce',
    description: 'Unix socket permission denied for non-root user',
    log: `docker ps
permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Get "http://%2Fvar%2Frun%2Fdocker.sock/v1.24/containers/json": dial unix /var/run/docker.sock: connect: permission denied
Error: failed to refresh running containers list.
Ensure user belongs to unix 'docker' group.`,
  },
  {
    id: 'cargo-linker',
    label: 'Rust linker "cc" not found',
    runtime: 'rust',
    os: 'linux',
    packageName: 'rustc / cargo',
    description: 'C compiler toolchain missing during cargo build',
    log: `cargo build --release
   Compiling libc v0.2.155
   Compiling proc-macro2 v1.0.86
   Compiling quote v1.0.36
   Compiling syn v2.0.68
error: linker \`cc\` not found
  |
  = note: No such file or directory (os error 2)

error: could not compile \`my-rust-app\` (bin "my-rust-app") due to 1 previous error`,
  },
  {
    id: 'port-collision',
    label: 'Port 3000 EADDRINUSE',
    runtime: 'node',
    os: 'macos',
    packageName: 'dev-server',
    description: 'Address already in use / zombie process collision',
    log: `npm run dev
> next dev
▲ Next.js 14.2.3
- Local:        http://localhost:3000
- Environments: .env.local

[Error: listen EADDRINUSE: address already in use :::3000] {
  code: 'EADDRINUSE',
  errno: -48,
  syscall: 'listen',
  address: '::',
  port: 3000
}`,
  },
]

interface InputFormProps {
  rawLog: string
  onLogChange: (val: string) => void
  environment: EnvironmentContext
  onEnvironmentChange: (env: EnvironmentContext) => void
  screenshotFile: File | null
  screenshotPreviewUrl: string | null
  onScreenshotChange: (file: File | null) => void
  onSubmit: () => void
  onClear: () => void
  isLoading: boolean
  activeEngineName?: string
}

export function InputForm({
  rawLog,
  onLogChange,
  environment,
  onEnvironmentChange,
  screenshotFile,
  screenshotPreviewUrl,
  onScreenshotChange,
  onSubmit,
  onClear,
  isLoading,
  activeEngineName,
}: InputFormProps) {
  const [autoDetect, setAutoDetect] = React.useState(true)
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const lineCount = React.useMemo(() => {
    if (!rawLog) return 0
    return rawLog.split('\n').length
  }, [rawLog])

  const charCount = rawLog.length

  function handleLogInput(text: string) {
    onLogChange(text)
    if (autoDetect) {
      detectAndSetEnvironment(text)
    }
  }

  function detectAndSetEnvironment(text: string) {
    const lower = text.toLowerCase()
    let detectedOs: OperatingSystem = environment.os
    let detectedRuntime = environment.runtime

    // OS detection
    if (lower.includes('darwin') || lower.includes('macos') || lower.includes('/users/') || lower.includes('brew')) {
      detectedOs = 'macos'
    } else if (lower.includes('linux') || lower.includes('ubuntu') || lower.includes('debian') || lower.includes('apt') || lower.includes('/var/run/docker.sock')) {
      detectedOs = 'linux'
    } else if (lower.includes('windows') || lower.includes('c:\\') || lower.includes('win32') || lower.includes('powershell')) {
      detectedOs = 'windows'
    }

    // Runtime detection
    if (lower.includes('node') || lower.includes('npm') || lower.includes('gyp') || lower.includes('yarn') || lower.includes('pnpm')) {
      detectedRuntime = 'node'
    } else if (lower.includes('pip') || lower.includes('python') || lower.includes('py_') || lower.includes('.py')) {
      detectedRuntime = 'python'
    } else if (lower.includes('docker') || lower.includes('containerd')) {
      detectedRuntime = 'docker'
    } else if (lower.includes('cargo') || lower.includes('rustc')) {
      detectedRuntime = 'rust'
    }

    if (detectedOs !== environment.os || detectedRuntime !== environment.runtime) {
      onEnvironmentChange({
        ...environment,
        os: detectedOs,
        runtime: detectedRuntime,
      })
    }
  }

  function handleSelectPreset(preset: PresetError) {
    onLogChange(preset.log)
    onEnvironmentChange({
      os: preset.os,
      runtime: preset.runtime,
      version: environment.version,
    })
    toast(`Loaded preset: ${preset.label}`, {
      description: `${preset.os} · ${preset.runtime}`,
    })
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      onScreenshotChange(file)
      toast.success('Screenshot attached', { description: file.name })
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onScreenshotChange(file)
      toast.success('Screenshot attached', { description: file.name })
    }
  }

  return (
    <div className="flex flex-col space-y-5 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-md">
      {/* Card Header & Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
              <FileCode2 className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
              Terminal Error Log
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {rawLog && (
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                title="Clear input"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Sample Error Presets
            </span>
            <span className="text-[10px] text-zinc-400">Click to test instant diagnostic</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:border-emerald-500/40 hover:bg-zinc-800 hover:text-emerald-300"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Text Area */}
      <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 shadow-inner focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/20">
        <textarea
          value={rawLog}
          onChange={(e) => handleLogInput(e.target.value)}
          placeholder={`Paste terminal trace or compiler stderr here...\n\nExample:\ngyp ERR! find Python\ngyp ERR! stack Error: Could not find any Python installation to use\n...`}
          rows={11}
          className="w-full resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-zinc-200 placeholder:text-zinc-400 focus:outline-none"
          spellCheck={false}
        />

        {/* Counter footer */}
        <div className="flex items-center justify-between border-t border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 text-[11px] font-mono text-zinc-400">
          <span>{lineCount} lines · {charCount} chars</span>
          <span className="text-zinc-400">Hotkeys: ⌘ + Enter or Ctrl + Enter</span>
        </div>
      </div>

      {/* Screenshot Dropzone */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {screenshotPreviewUrl ? (
          <div className="relative flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="flex items-center gap-3">
              <img
                src={screenshotPreviewUrl}
                alt="Attached error preview"
                className="h-12 w-12 rounded-lg object-cover ring-1 ring-zinc-700"
              />
              <div className="text-xs">
                <p className="font-medium text-zinc-200">{screenshotFile?.name || 'Error screenshot'}</p>
                <p className="text-zinc-400">Attached for multi-modal context</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onScreenshotChange(null)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition-all',
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
            )}
          >
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Upload className="h-3.5 w-3.5 text-zinc-400" />
              <span>Drag & drop terminal screenshot or click to browse</span>
            </div>
          </div>
        )}
      </div>

      {/* Environment Selector Component */}
      <EnvironmentSelector
        value={environment}
        onChange={onEnvironmentChange}
        autoDetect={autoDetect}
        onAutoDetectToggle={setAutoDetect}
      />

      {/* Submit Action Button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading || !rawLog.trim()}
        className={cn(
          'group relative flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold text-zinc-950 transition-all shadow-lg',
          rawLog.trim() && !isLoading
            ? 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 shadow-emerald-500/20 hover:brightness-105 active:scale-[0.99]'
            : 'cursor-not-allowed bg-zinc-800 text-zinc-400'
        )}
      >
        <Sparkles className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        <span>
          {isLoading
            ? `Analyzing with ${activeEngineName || 'Gemma 2 AI'}...`
            : `Diagnose with ${activeEngineName || 'Gemma 2 AI'}`}
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-950/20 bg-zinc-950/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-900">
          ⌘ + ↵
        </kbd>
      </button>

      {/* Engine Status Note */}
      <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-500">
        <Sparkles className="h-3 w-3 text-emerald-400" />
        <span>
          Armed with <span className="font-semibold text-zinc-400">{activeEngineName || 'Gemma 2 AI'}</span> & OS heuristics
        </span>
      </div>
    </div>
  )
}
