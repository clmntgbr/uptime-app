"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VariableInput } from "@/components/variable/variable-input"
import { AvailableVariable } from "@/lib/variable/types"

export interface KeyValuePair {
  key: string
  value: string
}

interface KeyValueEditorProps {
  pairs: KeyValuePair[]
  onChange: (pairs: KeyValuePair[]) => void
  variables: AvailableVariable[]
  keyPlaceholder?: string
  valuePlaceholder?: string
}

export function toRecord(pairs: KeyValuePair[]): Record<string, string> | undefined {
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
  pairs,
  onChange,
  variables,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: KeyValueEditorProps) {
  const updatePair = (index: number, patch: Partial<KeyValuePair>) => {
    onChange(pairs.map((pair, i) => (i === index ? { ...pair, ...patch } : pair)))
  }

  return (
    <div className="flex flex-col gap-2">
      {pairs.map((pair, index) => (
        <div key={index} className="flex items-start gap-2">
          <Input
            value={pair.key}
            onChange={(event) => updatePair(index, { key: event.target.value })}
            placeholder={keyPlaceholder}
            className="min-w-0 flex-1"
            autoComplete="off"
          />
          <div className="min-w-0 flex-[2]">
            <VariableInput
              value={pair.value}
              onChange={(value) => updatePair(index, { value })}
              variables={variables}
              placeholder={valuePlaceholder}
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onChange(pairs.filter((_, i) => i !== index))}
          >
            Delete
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...pairs, { key: "", value: "" }])}
      >
        Add
      </Button>
    </div>
  )
}
