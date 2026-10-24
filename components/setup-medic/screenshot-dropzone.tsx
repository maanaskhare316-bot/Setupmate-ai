'use client'

import { useState } from 'react'
import { ImageUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ScreenshotDropzoneProps = {
  file: File | null
  onChange: (file: File | null) => void
}

export function ScreenshotDropzone({ file, onChange }: ScreenshotDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  function handleFiles(files: FileList | null) {
    const image = files?.[0]
    if (image && image.type.startsWith('image/')) onChange(image)
  }

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ImageUp className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · ready for OCR</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Remove screenshot"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      className={cn(
        'flex h-80 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 text-center transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary/50 hover:bg-primary/5 sm:h-96',
        isDragging && 'border-primary bg-primary/10',
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
        <ImageUp className="size-5" aria-hidden="true" />
      </span>
      <span className="text-sm font-medium">Drop a terminal screenshot here</span>
      <span className="text-xs text-muted-foreground">PNG, JPG, or WebP · text is extracted automatically</span>
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
    </label>
  )
}
