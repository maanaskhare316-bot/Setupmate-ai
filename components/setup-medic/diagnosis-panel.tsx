'use client'

import {
  AlertOctagon,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  Cpu,
  Lightbulb,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { environmentLabel, type Diagnosis } from '@/lib/diagnosis'
import { cn } from '@/lib/utils'
import { CommandBlock } from './command-block'
import { DiagnosisSkeleton } from './diagnosis-skeleton'

export type PanelView = 'empty' | 'analyzing' | 'result'

const VIEWS: { id: PanelView; label: string }[] = [
  { id: 'empty', label: 'Empty' },
  { id: 'analyzing', label: 'Analyzing' },
  { id: 'result', label: 'Diagnosis' },
]

type DiagnosisPanelProps = {
  view: PanelView
  onViewChange: (view: PanelView) => void
  diagnosis: Diagnosis | null
  isResolved: boolean
  isSaved: boolean
  onResolve: () => void
  onSave: () => void
  onAlternative: () => void
}

function SectionHeading({ icon: Icon, index, id, children }: { icon: typeof Lightbulb; index: number; id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="flex items-center gap-2 text-sm font-semibold">
      <span className="flex size-6 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <span className="font-mono text-xs text-muted-foreground">0{index}</span>
      {children}
    </h3>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-[28rem] flex-col items-center justify-center gap-4 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_30px_-8px_var(--color-primary)]">
        <Stethoscope className="size-6" aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <p className="font-medium">No diagnosis yet</p>
        <p className="text-sm text-pretty text-muted-foreground">
          Paste a terminal log or pick a sample error, then press{' '}
          <kbd className="rounded border border-border bg-muted px-1 font-mono text-[11px]">
            <span className="[font-family:system-ui]">⌘</span> + Enter
          </kbd>{' '}
          to generate a root cause and step-by-step fix.
        </p>
      </div>
    </div>
  )
}

function Result({ diagnosis }: { diagnosis: Diagnosis }) {
  const critical = diagnosis.severity === 'critical'
  const SeverityIcon = critical ? AlertOctagon : AlertTriangle

  return (
    <div key={diagnosis.id} className="flex flex-col gap-7 py-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
      <div
        className={cn(
          'flex flex-col gap-3 rounded-lg border p-4',
          critical ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold',
              critical ? 'border-destructive/40 bg-destructive/15 text-destructive' : 'border-warning/40 bg-warning/15 text-warning',
            )}
          >
            <SeverityIcon className="size-3.5" aria-hidden="true" />
            {diagnosis.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            <Cpu className="size-3" aria-hidden="true" />
            {environmentLabel(diagnosis.env)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            {diagnosis.timeToFix}
          </span>
        </div>
        <code className="block truncate font-mono text-xs text-rose-300/90" title={diagnosis.signature}>
          {diagnosis.signature}
        </code>
        <p className="text-sm text-pretty">{diagnosis.summary}</p>
        <div className="flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Diagnosis confidence"
            aria-valuenow={diagnosis.confidence}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-info transition-all duration-700"
              style={{ width: `${diagnosis.confidence}%` }}
            />
          </div>
          <span className="font-mono text-xs text-muted-foreground">{diagnosis.confidence}% confidence</span>
        </div>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="root-cause">
        <SectionHeading icon={Lightbulb} index={1} id="root-cause">
          Root Cause
        </SectionHeading>
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          {diagnosis.rootCause.map((paragraph) => (
            <p key={paragraph} className="text-pretty">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="action-plan">
        <SectionHeading icon={ListChecks} index={2} id="action-plan">
          Step-by-Step Action Plan
        </SectionHeading>
        <ol className="relative flex flex-col gap-5">
          {diagnosis.steps.map((step, i) => (
            <li key={step.title} className="relative flex gap-3">
              {i < diagnosis.steps.length - 1 && (
                <span className="absolute top-8 bottom-[-1.25rem] left-3.5 w-px bg-border" aria-hidden="true" />
              )}
              <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-background font-mono text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                <CommandBlock command={step.command} why={step.why} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="verification">
        <SectionHeading icon={ShieldCheck} index={3} id="verification">
          Verification Check
        </SectionHeading>
        <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm text-muted-foreground">Run this to confirm the issue is resolved:</p>
          <CommandBlock command={diagnosis.verification.command} />
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" />
            Expected output includes
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{diagnosis.verification.expected}</code>
          </p>
        </div>
      </section>
    </div>
  )
}

export function DiagnosisPanel({
  view,
  onViewChange,
  diagnosis,
  isResolved,
  isSaved,
  onResolve,
  onSave,
  onAlternative,
}: DiagnosisPanelProps) {
  return (
    <Card className="gap-0 border-border bg-card/70 py-0 shadow-2xl shadow-black/20 backdrop-blur">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border py-4">
        <CardTitle className="text-base">Diagnosis &amp; Resolution Plan</CardTitle>
        <div role="group" aria-label="Panel state" className="flex rounded-lg border border-border bg-muted/40 p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={view === v.id}
              onClick={() => onViewChange(v.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                view === v.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {view === 'analyzing' && <DiagnosisSkeleton />}
        {view === 'empty' && <EmptyState />}
        {view === 'result' && diagnosis && <Result diagnosis={diagnosis} />}
      </CardContent>

      {view === 'result' && diagnosis && (
        <CardFooter className="flex flex-col gap-2 border-t border-border bg-muted/20 py-4 sm:flex-row">
          <Button className="w-full sm:flex-1" onClick={onResolve} disabled={isResolved}>
            <CheckCircle2 aria-hidden="true" />
            {isResolved ? 'Resolved' : 'Mark as Resolved'}
          </Button>
          <Button variant="outline" className="w-full sm:flex-1" onClick={onSave} disabled={isSaved}>
            {isSaved ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
            {isSaved ? 'Saved' : 'Save Solution'}
          </Button>
          <Button variant="ghost" className="w-full sm:flex-1" onClick={onAlternative}>
            <RefreshCw aria-hidden="true" />
            {diagnosis.alternative ? 'Back to Primary Fix' : 'Get Alternative Fix'}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
