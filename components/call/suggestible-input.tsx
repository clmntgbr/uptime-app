"use client"

import { Input } from "@/components/ui/input"
import {
  searchCallSuggestions,
  type CallSuggestionKind,
} from "@/lib/call/suggestions"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

export function SuggestibleInput({
  workflowId,
  kind,
  value,
  onChange,
  placeholder,
  className,
}: {
  workflowId: string
  kind: CallSuggestionKind
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  const [options, setOptions] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const handle = window.setTimeout(() => {
      void searchCallSuggestions(workflowId, kind, value, 20)
        .then((items) => {
          if (!cancelled) setOptions(items)
        })
        .catch(() => {
          if (!cancelled) setOptions([])
        })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [workflowId, kind, value])

  const query = value.trim().toLowerCase()
  const suggestions = focused
    ? options.filter((option) => {
        if (!query) return true
        return option.toLowerCase().includes(query)
      })
    : []

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(className)}
        autoComplete="off"
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Let mousedown on a suggestion apply before closing.
          window.setTimeout(() => setFocused(false), 150)
        }}
      />
      {suggestions.length > 0 ? (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
          {suggestions.map((option) => (
            <li key={option}>
              <button
                type="button"
                className="flex w-full items-center px-3 py-1.5 text-start hover:bg-muted"
                onMouseDown={(event) => {
                  event.preventDefault()
                  onChange(option)
                  setFocused(false)
                }}
              >
                <span className="truncate">{option}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
