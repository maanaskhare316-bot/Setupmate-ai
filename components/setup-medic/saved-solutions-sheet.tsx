'use client'

import { useState } from 'react'
import { Bookmark, BookmarkX, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { environmentLabel, type SavedSolution } from '@/lib/diagnosis'
import { cn } from '@/lib/utils'

type SavedSolutionsSheetProps = {
  saved: SavedSolution[]
  onLoad: (item: SavedSolution) => void
  onRemove: (id: string) => void
}

export function SavedSolutionsSheet({ saved, onLoad, onRemove }: SavedSolutionsSheetProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" className="h-9 gap-1.5" />}>
        <Bookmark className="size-3.5" aria-hidden="true" />
        <span className="hidden lg:inline">Saved Solutions</span>
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-mono text-[10px] font-semibold text-primary-foreground"
          aria-label={`${saved.length} saved`}
        >
          {saved.length}
        </span>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 border-border bg-card sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Saved Solutions</SheetTitle>
          <SheetDescription>Fixes you bookmarked. Load one to re-open its resolution plan.</SheetDescription>
        </SheetHeader>
        {saved.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <Bookmark className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No saved solutions yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 overflow-y-auto p-4">
            {saved.map((item) => (
              <li key={item.id} className="group flex items-stretch rounded-lg border border-border bg-muted/30 transition-colors hover:border-primary/40">
                <button
                  type="button"
                  onClick={() => {
                    onLoad(item)
                    setOpen(false)
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-l-lg p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      item.severity === 'critical' ? 'bg-destructive' : 'bg-warning',
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{item.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.label}</span>
                    <span className="font-mono text-[11px] text-muted-foreground/80">
                      {environmentLabel(item.env)} · {item.savedAt}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.title}`}
                  className="flex w-10 shrink-0 items-center justify-center rounded-r-lg border-l border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <BookmarkX className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
