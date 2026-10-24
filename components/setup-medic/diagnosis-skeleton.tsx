import { Loader2 } from 'lucide-react'

const STAGES = ['Parsing stack trace', 'Matching 500+ known failure signatures', 'Resolving environment & dependency graph', 'Drafting OS-specific fix plan']

export function DiagnosisSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-medium">Analyzing your error…</p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {STAGES.map((stage, i) => (
          <li
            key={stage}
            className="flex items-center gap-3 font-mono text-xs text-muted-foreground animate-in fade-in-0 slide-in-from-left-1 fill-mode-both"
            style={{ animationDelay: `${i * 350}ms` }}
          >
            <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
            {stage}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-20 animate-pulse rounded-lg bg-muted/60" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="size-7 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-9 animate-pulse rounded-md bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  )
}
