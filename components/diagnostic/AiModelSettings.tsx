'use client'

import * as React from 'react'
import type { AiConfig, AiProvider } from '@/types/diagnostic'
import {
  Sparkles,
  Settings,
  Cpu,
  Zap,
  HardDrive,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Shield,
  HelpCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export const AI_PROVIDERS: {
  id: AiProvider
  name: string
  modelTag: string
  tagColor: string
  description: string
  icon: any
  badge?: string
}[] = [
  {
    id: 'gemma-google',
    name: 'Gemma 2 (Google AI Studio)',
    modelTag: 'gemma-2-9b-it',
    tagColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    description: "Google's state-of-the-art open model hosted on Google AI Studio infrastructure.",
    icon: Sparkles,
    badge: 'Recommended',
  },
  {
    id: 'gemma-groq',
    name: 'Gemma 2 (Groq Fast Inference)',
    modelTag: 'gemma2-9b-it',
    tagColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    description: 'Sub-second diagnostics powered by Groq LPU inference engine (Free Tier).',
    icon: Zap,
    badge: '⚡ Ultra Fast',
  },
  {
    id: 'gemma-ollama',
    name: 'Gemma 2 (Local Ollama)',
    modelTag: 'localhost:11434',
    tagColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    description: 'Runs completely offline and 100% private on your local machine via Ollama.',
    icon: HardDrive,
    badge: 'Offline / Free',
  },
  {
    id: 'auto',
    name: 'Auto-Select AI Engine',
    modelTag: 'Gemma / Fallback Chain',
    tagColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    description: 'Automatically detects available API keys, prioritizing Gemma models with rule fallback.',
    icon: Cpu,
  },
  {
    id: 'gemini',
    name: 'Gemini 1.5 Flash',
    modelTag: 'gemini-1.5-flash',
    tagColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    description: 'High-speed multivariable analysis powered by Google Gemini.',
    icon: Sparkles,
  },
  {
    id: 'offline',
    name: 'Deterministic Rule Engine',
    modelTag: 'Offline Built-in',
    tagColor: 'text-zinc-400 border-zinc-700 bg-zinc-800/50',
    description: 'Zero external API calls. Accurate heuristic diagnosis for standard developer tools.',
    icon: Shield,
  },
]

interface AiModelSettingsProps {
  config: AiConfig
  onChange: (config: AiConfig) => void
}

export function AiModelSettings({ config, onChange }: AiModelSettingsProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'gemma' | 'groq' | 'ollama'>('gemma')

  // Form State
  const [googleKey, setGoogleKey] = React.useState('')
  const [groqKey, setGroqKey] = React.useState('')
  const [ollamaUrl, setOllamaUrl] = React.useState('http://localhost:11434')

  // Test Connection State
  const [testing, setTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{
    ok: boolean
    message: string
    latencyMs?: number
  } | null>(null)

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('setupmedic_ai_keys')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.googleKey) setGoogleKey(parsed.googleKey)
        if (parsed.groqKey) setGroqKey(parsed.groqKey)
        if (parsed.ollamaUrl) setOllamaUrl(parsed.ollamaUrl)
      }
    } catch {
      // localStorage may be disabled
    }
  }, [])

  function handleSaveKeys() {
    try {
      localStorage.setItem(
        'setupmedic_ai_keys',
        JSON.stringify({ googleKey, groqKey, ollamaUrl })
      )

      // Sync active config's custom key depending on selected provider
      let customApiKey: string | undefined = undefined
      if (config.provider === 'gemma-google' || config.provider === 'gemini') {
        customApiKey = googleKey
      } else if (config.provider === 'gemma-groq') {
        customApiKey = groqKey
      }

      onChange({
        ...config,
        customApiKey,
        ollamaBaseUrl: ollamaUrl,
      })

      toast.success('AI Settings Saved', {
        description: 'API keys and configuration have been saved securely to your browser.',
      })
      setIsOpen(false)
    } catch {
      toast.error('Failed to save settings')
    }
  }

  async function handleTestConnection(providerToTest: AiProvider) {
    setTesting(true)
    setTestResult(null)

    let apiKey = ''
    if (providerToTest === 'gemma-google' || providerToTest === 'gemini') {
      apiKey = googleKey
    } else if (providerToTest === 'gemma-groq') {
      apiKey = groqKey
    }

    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerToTest,
          apiKey,
          ollamaBaseUrl: ollamaUrl,
        }),
      })

      const json = await res.json()
      setTestResult(json)

      if (json.ok) {
        toast.success('Connection Verified!', {
          description: `${json.message} (${json.latencyMs}ms)`,
        })
      } else {
        toast.error('Connection Test Failed', {
          description: json.message,
        })
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || 'Network request failed',
      })
      toast.error('Connection check failed')
    } finally {
      setTesting(false)
    }
  }

  const currentProvider = AI_PROVIDERS.find((p) => p.id === config.provider) || AI_PROVIDERS[0]
  const Icon = currentProvider.icon

  return (
    <>
      {/* Trigger & Model Selector Pill */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            value={config.provider}
            onChange={(e) => {
              const newProvider = e.target.value as AiProvider
              let customApiKey: string | undefined = undefined
              if (newProvider === 'gemma-google' || newProvider === 'gemini') {
                customApiKey = googleKey
              } else if (newProvider === 'gemma-groq') {
                customApiKey = groqKey
              }
              onChange({
                ...config,
                provider: newProvider,
                customApiKey,
                ollamaBaseUrl: ollamaUrl,
              })
              toast.info(`Switched AI Engine: ${newProvider}`)
            }}
            aria-label="Select AI Engine"
            className="h-8 appearance-none rounded-lg border border-zinc-800 bg-zinc-900/90 pl-7 pr-8 font-mono text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {AI_PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id} className="bg-zinc-900 py-1 text-zinc-100">
                {provider.name}
              </option>
            ))}
          </select>
          <Icon className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-emerald-400" />
          <span className="pointer-events-none absolute right-2 top-2.5 text-[10px] text-zinc-500">▼</span>
        </div>

        {/* Settings Dialog Button */}
        <button
          type="button"
          onClick={() => {
            setTestResult(null)
            setIsOpen(true)
          }}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          title="Configure AI API keys (Gemma 2, Groq, Ollama)"
        >
          <Settings className="h-3.5 w-3.5 text-zinc-400" />
          <span className="hidden sm:inline">AI Keys</span>
        </button>
      </div>

      {/* AI Settings Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 p-6 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-zinc-100">
                  Gemma AI & Engine Settings
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Configure your API keys or local Ollama endpoint for Gemma 2 diagnostics.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Provider Tabs */}
          <div className="mt-4 flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('gemma')
                setTestResult(null)
              }}
              className={cn(
                'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                activeTab === 'gemma'
                  ? 'bg-emerald-500/15 text-emerald-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Google AI (Gemma 2)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('groq')
                setTestResult(null)
              }}
              className={cn(
                'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                activeTab === 'groq'
                  ? 'bg-amber-500/15 text-amber-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Groq (Fast Gemma)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('ollama')
                setTestResult(null)
              }}
              className={cn(
                'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                activeTab === 'ollama'
                  ? 'bg-cyan-500/15 text-cyan-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Ollama (Offline)
            </button>
          </div>

          {/* Tab 1: Google AI Studio Gemma */}
          {activeTab === 'gemma' && (
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Google AI Studio API Key (GEMMA_API_KEY)
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                  >
                    <span>Get Free Key</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="relative mt-1.5">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={googleKey}
                    onChange={(e) => setGoogleKey(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <Key className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-zinc-500" />
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Runs <code className="text-emerald-400">gemma-2-9b-it</code> and <code className="text-emerald-400">gemma-2-27b-it</code> via official Google Generative Language endpoints.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-3">
                <span className="text-xs text-zinc-400">Status Check:</span>
                <button
                  type="button"
                  disabled={testing}
                  onClick={() => handleTestConnection('gemma-google')}
                  className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-emerald-400" />}
                  <span>Test Connection</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Groq Gemma */}
          {activeTab === 'groq' && (
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Groq Cloud API Key (GROQ_API_KEY)
                  </label>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                  >
                    <span>Get Free Key</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="relative mt-1.5">
                  <input
                    type="password"
                    placeholder="gsk_..."
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <Key className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-zinc-500" />
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Groq runs <code className="text-amber-400">gemma2-9b-it</code> at 800+ tokens/sec. Super-fast developer diagnostic response.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-3">
                <span className="text-xs text-zinc-400">Status Check:</span>
                <button
                  type="button"
                  disabled={testing}
                  onClick={() => handleTestConnection('gemma-groq')}
                  className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-amber-400" />}
                  <span>Test Connection</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Local Ollama */}
          {activeTab === 'ollama' && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300">
                  Ollama Base Endpoint
                </label>
                <div className="relative mt-1.5">
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <HardDrive className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-zinc-500" />
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Requires Ollama running locally. Run <code className="text-cyan-400">ollama run gemma2</code> in your terminal.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-3">
                <span className="text-xs text-zinc-400">Status Check:</span>
                <button
                  type="button"
                  disabled={testing}
                  onClick={() => handleTestConnection('gemma-ollama')}
                  className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-cyan-400" />}
                  <span>Test Connection</span>
                </button>
              </div>
            </div>
          )}

          {/* Live Test Feedback Banner */}
          {testResult && (
            <div
              className={cn(
                'flex items-start gap-2.5 rounded-lg border p-3 text-xs',
                testResult.ok
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              )}
            >
              {testResult.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              )}
              <div className="space-y-0.5">
                <p className="font-semibold">{testResult.ok ? 'Connection Verified' : 'Check Failed'}</p>
                <p className="text-[11px] opacity-90">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveKeys}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Save & Apply</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
