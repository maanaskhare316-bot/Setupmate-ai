'use client'

import { Apple, Check, ChevronDown, MonitorCog, Server, Wand2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MAC_ARCHES,
  OPERATING_SYSTEMS,
  RUNTIMES,
  type Environment,
  type MacArch,
  type OperatingSystem,
  type Runtime,
} from '@/lib/diagnosis'
import { cn } from '@/lib/utils'

const OS_ICONS: Record<OperatingSystem, typeof Apple> = {
  macos: Apple,
  linux: Server,
  wsl: MonitorCog,
}

type EnvironmentTogglesProps = {
  env: Environment
  onEnvChange: (env: Environment) => void
  runtimes: Runtime[]
  onToggleRuntime: (runtime: Runtime) => void
  autoDetect: boolean
}

const pillBase =
  'inline-flex h-8 items-center gap-1.5 border px-3 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
const pillActive = 'border-primary/50 bg-primary/10 text-primary shadow-[0_0_14px_-6px_var(--color-primary)]'
const pillIdle = 'border-border bg-muted/30 text-muted-foreground hover:border-zinc-700 hover:text-foreground'

export function EnvironmentToggles({ env, onEnvChange, runtimes, onToggleRuntime, autoDetect }: EnvironmentTogglesProps) {
  const archLabel = MAC_ARCHES.find((a) => a.id === env.arch)?.label

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/15 p-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Target Environment
          {autoDetect && (
            <span className="inline-flex items-center gap-1 rounded border border-info/30 bg-info/10 px-1.5 py-px font-mono text-[10px] tracking-normal text-info normal-case">
              <Wand2 className="size-3" aria-hidden="true" />
              auto
            </span>
          )}
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Operating system">
          {OPERATING_SYSTEMS.map((os) => {
            const Icon = OS_ICONS[os.id]
            const active = env.os === os.id
            const pill = (
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onEnvChange({ ...env, os: os.id })}
                className={cn(pillBase, active ? pillActive : pillIdle, os.id === 'macos' ? 'rounded-l-full border-r-0 pr-2' : 'rounded-full')}
              >
                {active && <Check className="size-3" aria-hidden="true" />}
                <Icon className="size-3.5" aria-hidden="true" />
                {os.label}
              </button>
            )
            if (os.id !== 'macos') return <span key={os.id}>{pill}</span>
            return (
              <span key={os.id} className="inline-flex">
                {pill}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        aria-label={`macOS architecture: ${archLabel}`}
                        className={cn(pillBase, active ? pillActive : pillIdle, 'rounded-r-full border-l-zinc-700 gap-1 pr-2.5 pl-2 font-mono text-[11px]')}
                      />
                    }
                  >
                    {archLabel}
                    <ChevronDown className="size-3" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>macOS architecture</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={env.arch}
                        onValueChange={(value) => onEnvChange({ os: 'macos', arch: value as MacArch })}
                      >
                        {MAC_ARCHES.map((arch) => (
                          <DropdownMenuRadioItem key={arch.id} value={arch.id}>
                            <span className="flex flex-col">
                              <span className="font-mono text-xs">{arch.label}</span>
                              <span className="text-[11px] text-muted-foreground">{arch.detail}</span>
                            </span>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Runtime &amp; Toolchain</legend>
        <div className="flex flex-wrap gap-2">
          {RUNTIMES.map((runtime) => {
            const active = runtimes.includes(runtime.id)
            return (
              <button
                key={runtime.id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleRuntime(runtime.id)}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  active ? 'border-info/40 bg-info/10 text-info' : pillIdle,
                )}
              >
                <span className={cn('size-1.5 rounded-full', active ? 'bg-info' : 'bg-zinc-600')} aria-hidden="true" />
                {runtime.label}
                {runtime.version && <span className="font-mono text-[11px] opacity-70">{runtime.version}</span>}
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
