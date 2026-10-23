"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { VariableInput } from "@/components/variable/variable-input"
import { AvailableVariable } from "@/lib/variable/types"
import { PlusIcon, Trash2Icon } from "lucide-react"

export interface KeyValuePair {
  key: string
  value: string
}

interface KeyValueEditorProps {
  label: string
  description: string
  pairs: KeyValuePair[]
  onChange: (pairs: KeyValuePair[]) => void
  variables: AvailableVariable[]
  keyPlaceholder?: string
  valuePlaceholder?: string
  addLabel?: string
}

export function toRecord(
  pairs: KeyValuePair[]
): Record<string, string> | undefined {
  const record: Record<string, string> = {}
  for (const pair of pairs) {
    const key = pair.key.trim()
    if (!key) continue
    record[key] = pair.value
  }
  return Object.keys(record).length ? record : undefined
}

export function fromRecord(record?: Record<string, string>): KeyValuePair[] {
  if (!record || !Object.keys(record).length) return []
  return Object.entries(record).map(([key, value]) => ({ key, value }))
}

export function KeyValueEditor({
  label,
  description,
  pairs,
  onChange,
  variables,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  addLabel = "Add entry",
}: KeyValueEditorProps) {
  const updatePair = (index: number, patch: Partial<KeyValuePair>) => {
    onChange(
      pairs.map((pair, i) => (i === index ? { ...pair, ...patch } : pair))
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">
        {pairs.map((pair, index) => (
          <div
            key={`${label}-${index}`}
            className="flex items-center gap-2"
          >
            <Input
              value={pair.key}
              onChange={(event) =>
                updatePair(index, { key: event.target.value })
              }
              placeholder={keyPlaceholder}
              className="h-9 min-w-0 flex-1 bg-background dark:bg-background"
              autoComplete="off"
            />
            <div className="min-w-0 flex-1">
              <VariableInput
                value={pair.value}
                onChange={(value) => updatePair(index, { value })}
                variables={variables}
                placeholder={valuePlaceholder}
                className="h-9 bg-background dark:bg-background"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onChange(pairs.filter((_, i) => i !== index))}
              aria-label="Remove entry"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...pairs, { key: "", value: "" }])}
      >
        <PlusIcon className="size-4" />
        {addLabel}
      </Button>
    </div>
  )
}
