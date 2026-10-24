'use client'

import { Fragment, useRef } from 'react'
import { cn } from '@/lib/utils'

type Token = { text: string; className?: string }
type LineKind = 'error' | 'warn' | 'normal'

const TOKEN_PATTERN =
  /(npm ERR!|gyp ERR!|npm WARN|gyp info|ERROR:?|WARNING:?|Error:?|LoadError|\[!\]|ERESOLVE|CERTIFICATE_VERIFY_FAILED|permission denied|failed|^\$|\bat\b|(?:\/[\w.@%-]+)+(?::\d+(?::\d+)?)?|@?[\w-]+@[\^~]?[\d.x|\s^]+|"[^"]*"|'[^']*'|\d+(?:\.\d+)*)/gi

function classify(match: string): string | undefined {
  const lower = match.toLowerCase()
  if (lower === 'npm err!' || lower === 'gyp err!' || lower.startsWith('error') || lower === 'loaderror' || match === '[!]')
    return 'text-rose-400 font-semibold'
  if (lower === 'npm warn' || lower.startsWith('warning')) return 'text-amber-300 font-semibold'
  if (lower === 'gyp info') return 'text-cyan-400'
  if (match === '$') return 'text-emerald-400 font-semibold'
  if (lower === 'eresolve' || lower === 'failed' || lower === 'permission denied' || lower === 'certificate_verify_failed')
    return 'text-rose-300'
  if (lower === 'at') return 'text-zinc-500'
  if (match.startsWith('/')) return 'text-cyan-300/90'
  if (match.startsWith('"') || match.startsWith("'")) return 'text-emerald-300'
  if (match.includes('@')) return 'text-violet-300'
  return 'text-amber-200/90'
}

function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  let last = 0
  for (const m of line.matchAll(TOKEN_PATTERN)) {
    const index = m.index ?? 0
    if (index > last) tokens.push({ text: line.slice(last, index) })
    tokens.push({ text: m[0], className: classify(m[0]) })
    last = index + m[0].length
  }
  if (last < line.length) tokens.push({ text: line.slice(last) })
  return tokens
}

function lineKind(line: string): LineKind {
  if (/^\s*(npm WARN|WARNING)/i.test(line)) return 'warn'
  if (/ERR!|^\s*ERROR|Error:|LoadError|\[!\]|permission denied|incompatible architecture/i.test(line)) return 'error'
  return 'normal'
}

type CodeEditorProps = {
  value: string
  onChange?: (value: string) => void
  fileName: string
  readOnly?: boolean
  placeholder?: string
  className?: string
}

export function CodeEditor({ value, onChange, fileName, readOnly, placeholder, className }: CodeEditorProps) {
  const highlightRef = useRef<HTMLPreElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const lines = value.split('\n')
  const kinds = lines.map(lineKind)
  const errorCount = kinds.filter((k) => k === 'error').length

  function syncScroll(event: React.UIEvent<HTMLTextAreaElement>) {
    const { scrollTop, scrollLeft } = event.currentTarget
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop
      highlightRef.current.scrollLeft = scrollLeft
    }
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/90 shadow-inner ring-primary/40 transition-shadow focus-within:ring-2',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950/60 px-3 py-2">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-rose-500/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
        </span>
        <span className="font-mono text-[11px] text-zinc-500">{fileName}</span>
        {errorCount > 0 && (
          <span className="ml-auto rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-px font-mono text-[10px] text-rose-300">
            {errorCount} error {errorCount === 1 ? 'line' : 'lines'}
          </span>
        )}
        {readOnly && (
          <span className={cn('rounded border border-zinc-700 px-1.5 py-px font-mono text-[10px] text-zinc-500', errorCount === 0 && 'ml-auto')}>
            read-only
          </span>
        )}
      </div>
      <div className="relative flex h-80 font-mono text-xs leading-6 sm:h-[22rem]">
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="w-11 shrink-0 overflow-hidden border-r border-zinc-800/80 py-3 text-right text-zinc-600 select-none"
        >
          {lines.map((_, i) => (
            <div
              key={i}
              className={cn(
                'border-l-2 border-transparent pr-3',
                kinds[i] === 'error' && 'border-rose-500 bg-rose-500/10 text-rose-400',
                kinds[i] === 'warn' && 'border-amber-400/70 bg-amber-400/5 text-amber-300/80',
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <pre
            ref={highlightRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden py-3 whitespace-pre text-zinc-300"
          >
            <div className="w-max min-w-full">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    'px-3',
                    kinds[i] === 'error' && 'bg-rose-500/10',
                    kinds[i] === 'warn' && 'bg-amber-400/5',
                  )}
                >
                  {tokenize(line).map((token, j) => (
                    <Fragment key={j}>
                      {token.className ? <span className={token.className}>{token.text}</span> : token.text}
                    </Fragment>
                  ))}
                  {line.length === 0 && ' '}
                </div>
              ))}
            </div>
          </pre>
          {value.length === 0 && (
            <div className="pointer-events-none absolute inset-0 px-3 py-3 whitespace-pre text-zinc-600">
              {placeholder ?? 'npm ERR! code ERESOLVE\ngyp ERR! build error\n…paste your full terminal output here'}
            </div>
          )}
          <textarea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onScroll={syncScroll}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            wrap="off"
            aria-label={readOnly ? `${fileName} contents` : 'Terminal log'}
            className="absolute inset-0 size-full resize-none overflow-auto bg-transparent px-3 py-3 whitespace-pre text-transparent caret-emerald-400 outline-none selection:bg-emerald-400/25 selection:text-transparent"
          />
        </div>
      </div>
    </div>
  )
}
