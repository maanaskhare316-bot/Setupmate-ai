'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  getUserHistory,
  deleteDiagnosis,
  type StoredDiagnosis,
} from '@/lib/db/diagnoses'
import {
  Search,
  ArrowLeft,
  Trash2,
  Terminal,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Sparkles,
  Command,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const TAG_FILTERS = [
  { id: 'all', label: 'All Resolutions' },
  { id: 'macos', label: '#macos' },
  { id: 'linux', label: '#linux' },
  { id: 'windows', label: '#windows' },
  { id: 'node', label: '#node' },
  { id: 'python', label: '#python' },
  { id: 'docker', label: '#docker' },
]

export default function HistoryPage() {
  const [history, setHistory] = React.useState<StoredDiagnosis[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeTag, setActiveTag] = React.useState('all')
  const [selectedDiagnosis, setSelectedDiagnosis] = React.useState<StoredDiagnosis | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    async function loadData() {
      const data = await getUserHistory('guest')
      setHistory(data)
    }
    loadData()
  }, [])

  // Keyboard shortcut Cmd + K to focus search
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const success = await deleteDiagnosis(id)
    if (success) {
      setHistory((prev) => prev.filter((item) => item.id !== id))
      toast.success('Removed solution from history')
      if (selectedDiagnosis?.id === id) {
        setDialogOpen(false)
      }
    }
  }

  async function handleCopyScript(item: StoredDiagnosis, e: React.MouseEvent) {
    e.stopPropagation()
    const isWindows = item.environment.os === 'windows'
    let script = isWindows
      ? `# SetupMedic Fix: ${item.result.title}\n\n`
      : `#!/usr/bin/env bash\n# SetupMedic Fix: ${item.result.title}\nset -e\n\n`

    item.result.steps.forEach((s) => {
      script += `# Step ${s.id}: ${s.title}\n${s.command}\n\n`
    })
    script += `# Verification Step\n${item.result.verificationCommand}\n`

    await navigator.clipboard.writeText(script)
    setCopiedId(item.id)
    toast.success('Copied resolution script to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredItems = React.useMemo(() => {
    return history.filter((item) => {
      // Tag filter
      if (activeTag !== 'all') {
        const matchesOs = item.environment.os.toLowerCase() === activeTag.toLowerCase()
        const matchesRuntime = item.environment.runtime.toLowerCase().includes(activeTag.toLowerCase())
        if (!matchesOs && !matchesRuntime) return false
      }

      // Search query filter
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const titleMatch = item.result.title.toLowerCase().includes(q)
      const packageMatch = item.result.packageName?.toLowerCase().includes(q)
      const rootCauseMatch = item.result.rootCause.toLowerCase().includes(q)
      const osMatch = item.environment.os.toLowerCase().includes(q)
      const runtimeMatch = item.environment.runtime.toLowerCase().includes(q)

      return titleMatch || packageMatch || rootCauseMatch || osMatch || runtimeMatch
    })
  }, [history, activeTag, searchQuery])

  function getSeverityBadge(sev: string) {
    if (sev === 'critical') {
      return (
        <span className="flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400">
          <ShieldAlert className="h-3 w-3" /> Critical
        </span>
      )
    }
    if (sev === 'warning') {
      return (
        <span className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
          <AlertTriangle className="h-3 w-3" /> Warning
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
        <Info className="h-3 w-3" /> Notice
      </span>
    )
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      {/* Background radial gradient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(60%_100%_at_50%_0%,oklch(0.765_0.177_163.223/0.09),transparent)]"
      />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Workspace</span>
            </Link>

            <div className="h-4 w-px bg-zinc-800" />

            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
                <Terminal className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-zinc-100">SetupMedic</h1>
                <p className="text-[10px] font-mono text-zinc-400">Saved Solutions Archive</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span>{history.length} Saved Solutions</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Search & Tag Filter Bar */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past solutions by package, error title, or runtime... (Press ⌘ + K)"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-20 text-xs text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded border border-zinc-800 bg-zinc-950/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
              <Command className="h-2.5 w-2.5" /> K
            </div>
          </div>

          {/* Tag Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {TAG_FILTERS.map((tag) => {
              const isSelected = activeTag === tag.id
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setActiveTag(tag.id)}
                  className={cn(
                    'rounded-lg border px-3 py-1 text-xs font-mono transition-all',
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  )}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Results Grid */}
        <div className="mt-8">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
              <Terminal className="h-8 w-8 text-zinc-400" />
              <h3 className="mt-3 text-sm font-semibold text-zinc-300">No matching diagnoses found</h3>
              <p className="mt-1 text-xs text-zinc-400">
                Try adjusting your search query or switching tag filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedDiagnosis(item)
                    setDialogOpen(true)
                  }}
                  className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 transition-all hover:border-zinc-700/80 hover:bg-zinc-900/70 hover:shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {getSeverityBadge(item.result.severity)}
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                          {item.environment.os}
                        </span>
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                          {item.environment.runtime}
                        </span>
                      </div>

                      <span className="font-mono text-[10px] text-emerald-400">
                        {item.result.confidenceScore}% match
                      </span>
                    </div>

                    <div>
                      <h3 className="line-clamp-2 text-sm font-semibold text-zinc-100 group-hover:text-emerald-300">
                        {item.result.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-zinc-400">
                        {item.result.rootCause}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-5 flex items-center justify-between border-t border-zinc-800/60 pt-3">
                    <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-400">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleCopyScript(item, e)}
                        className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-zinc-200"
                        title="Copy script"
                      >
                        {copiedId === item.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-rose-400"
                        title="Delete from history"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Full Detail Dialog Modal */}
      {selectedDiagnosis && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-zinc-800 bg-zinc-950 p-6 text-zinc-100">
            <DialogHeader>
              <div className="flex items-center gap-2 pb-1">
                {getSeverityBadge(selectedDiagnosis.result.severity)}
                <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">
                  {selectedDiagnosis.environment.os} · {selectedDiagnosis.environment.runtime}
                </span>
                <span className="ml-auto font-mono text-xs text-emerald-400">
                  {selectedDiagnosis.result.confidenceScore}% confidence
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-zinc-100">
                {selectedDiagnosis.result.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Created {new Date(selectedDiagnosis.created_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {/* Root Cause */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Root Cause
                </h4>
                <p className="mt-1 text-xs text-zinc-200 leading-relaxed">
                  {selectedDiagnosis.result.rootCause}
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Resolution Commands ({selectedDiagnosis.result.steps.length})
                </h4>
                {selectedDiagnosis.result.steps.map((step) => (
                  <div
                    key={step.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
                  >
                    <div className="flex items-center justify-between text-xs pb-1">
                      <span className="font-semibold text-zinc-200">
                        {step.id}. {step.title}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {step.riskLevel} risk
                      </span>
                    </div>
                    <div className="mt-1 rounded bg-zinc-950 px-3 py-2 font-mono text-xs text-emerald-300">
                      $ {step.command}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400">{step.whyRunThis}</p>
                  </div>
                ))}
              </div>

              {/* Verification */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Verification Test
                </h4>
                <div className="mt-1 rounded bg-zinc-950 px-3 py-2 font-mono text-xs text-emerald-400">
                  $ {selectedDiagnosis.result.verificationCommand}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
