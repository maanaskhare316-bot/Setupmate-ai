'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type CommandBlockProps = {
  command: string
  why?: string
  className?: string
}

export function CommandBlock({ command, why, className }: CommandBlockProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className={cn(
        'group/cmd flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/90 py-1.5 pr-1.5 pl-3 font-mono text-[12.5px] transition-colors hover:border-zinc-700',
        className,
      )}
    >
      <span className="text-emerald-400 select-none" aria-hidden="true">
        $
      </span>
      <code className="min-w-0 flex-1 overflow-x-auto py-1 whitespace-nowrap text-zinc-200 [scrollbar-width:none]">
        {command}
      </code>
      {why && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label="Why run this?"
                className="flex size-7 shrink-0 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-cyan-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            }
          >
            <HelpCircle className="size-3.5" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-72 text-left leading-relaxed">
            <span className="mb-0.5 block font-semibold">Why run this?</span>
            {why}
          </TooltipContent>
        </Tooltip>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy command'}
        className={cn(
          'flex h-7 shrink-0 items-center gap-1 rounded px-2 font-sans text-[11px] font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          copied ? 'bg-emerald-400/15 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
        )}
      >
        {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
        <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Command copied to clipboard' : ''}
      </span>
    </div>
  )
}
