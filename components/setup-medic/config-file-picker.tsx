'use client'

import { FileCode2 } from 'lucide-react'
import { PRESET_LIST, PRESETS, type PresetId } from '@/lib/diagnosis'
import { cn } from '@/lib/utils'
import { CodeEditor } from './code-editor'

type ConfigFilePickerProps = {
  value: PresetId | null
  onChange: (id: PresetId) => void
}

export function ConfigFilePicker({ value, onChange }: ConfigFilePickerProps) {
  const selected = value ? PRESETS[value].configFile : null

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Detected config files" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESET_LIST.map((preset) => {
          const active = value === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(preset.id)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2.5 py-2 text-left font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                active
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground',
              )}
            >
              <FileCode2 className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{preset.configFile.name}</span>
            </button>
          )
        })}
      </div>
      {selected ? (
        <CodeEditor value={selected.content} fileName={selected.name} readOnly className="[&>div:last-child]:h-64 sm:[&>div:last-child]:h-72" />
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground sm:h-72">
          Select a project file to analyze alongside your error
        </div>
      )}
    </div>
  )
}
