'use client'

import { useEffect, useRef } from 'react'
import { ChevronDown, Search, Sparkles, SquareTerminal, Zap } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { PRESET_LIST, type PresetId, type SavedSolution } from '@/lib/diagnosis'
import { SavedSolutionsSheet } from './saved-solutions-sheet'

type AppHeaderProps = {
  saved: SavedSolution[]
  onLoadPreset: (id: PresetId) => void
  onLoadSaved: (item: SavedSolution) => void
  onRemoveSaved: (id: string) => void
}

export function AppHeader({ saved, onLoadPreset, onLoadSaved, onRemoveSaved }: AppHeaderProps) {
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-4 lg:gap-6 lg:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2.5" aria-label="SetupMedic home">
          <span className="relative flex size-9 items-center justify-center rounded-lg border border-primary/40 bg-gradient-to-br from-primary/25 to-info/10 text-primary shadow-[0_0_22px_-4px_var(--color-primary)]">
            <SquareTerminal className="size-[18px]" aria-hidden="true" />
            <Sparkles className="absolute -top-1 -right-1 size-3 text-info" aria-hidden="true" />
          </span>
          <span className="hidden items-center gap-2 sm:flex">
            <span className="text-[15px] font-semibold tracking-tight">SetupMedic</span>
            <span className="rounded border border-info/30 bg-info/10 px-1.5 py-px font-mono text-[10px] font-medium text-info">
              v1.0 (Beta)
            </span>
          </span>
        </a>

        <div className="relative mx-auto max-w-xl flex-1">
          <label htmlFor="global-search" className="sr-only">
            Search solved setup errors
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="global-search"
            ref={searchRef}
            type="search"
            placeholder="Search 500+ solved setup errors, npm, pip, docker..."
            className="h-9 border-border bg-muted/40 pr-14 pl-9 text-sm placeholder:text-muted-foreground/70"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
            <span className="[font-family:system-ui]">⌘</span>K
          </kbd>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" className="hidden h-9 gap-1.5 md:inline-flex" />}
            >
              <Zap className="size-3.5 text-warning" aria-hidden="true" />
              Quick Preset
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Load a sample error</DropdownMenuLabel>
                {PRESET_LIST.map((preset) => (
                  <DropdownMenuItem key={preset.id} onClick={() => onLoadPreset(preset.id)}>
                    <span className="flex flex-col">
                      <span>{preset.label}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{preset.logFile}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <SavedSolutionsSheet saved={saved} onLoad={onLoadSaved} onRemove={onRemoveSaved} />

          <Avatar className="size-8 border border-border">
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-info/20 text-xs font-medium">JD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
