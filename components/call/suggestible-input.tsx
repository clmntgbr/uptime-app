"use client"

import { Input } from "@/components/ui/input"
import {
  VARIABLE_TEXT_CLASS,
  VariableText,
} from "@/components/variable/variable-text"
import {
  searchCallSuggestions,
  type CallSuggestionKind,
} from "@/lib/call/suggestions"
import type { AvailableVariable } from "@/lib/variable/types"
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"

/** Open `{{` before the cursor, without a closing `}}` yet. */
function getVariableTrigger(
  value: string,
  cursor: number
): { start: number; query: string } | null {
  const before = value.slice(0, cursor)
  const start = before.lastIndexOf("{{")
  if (start === -1) return null

  const afterOpen = before.slice(start + 2)
  if (afterOpen.includes("}")) return null

  return { start, query: afterOpen }
}

export function SuggestibleInput({
  workflowId,
  kind,
  value,
  onChange,
  placeholder,
  className,
  variables = [],
}: {
  workflowId: string
  kind: CallSuggestionKind
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** When set, `{{` triggers variable suggestions and values render with VariableText. */
  variables?: AvailableVariable[]
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [options, setOptions] = useState<string[]>([])
  const withVariables = variables.length > 0

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

  const trigger = focused && withVariables ? getVariableTrigger(value, cursor) : null
  const variableQuery = trigger?.query.toLowerCase() ?? ""
  const variableSuggestions = trigger
    ? variables.filter((variable) =>
        variable.name.toLowerCase().includes(variableQuery)
      )
    : []

  const historyQuery = value.trim().toLowerCase()
  const historySuggestions =
    focused && !trigger
      ? options.filter((option) => {
          if (!historyQuery) return true
          return option.toLowerCase().includes(historyQuery)
        })
      : []

  const syncCursor = () => {
    const next = inputRef.current?.selectionStart ?? value.length
    setCursor(next)
  }

  const insertVariable = (name: string) => {
    if (!trigger) return
    const insertion = `{{${name}}}`
    const next = value.slice(0, trigger.start) + insertion + value.slice(cursor)
    onChange(next)
    setFocused(false)

    const caret = trigger.start + insertion.length
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(caret, caret)
      setCursor(caret)
      setFocused(true)
    })
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setCursor(event.target.selectionStart ?? event.target.value.length)
        }}
        placeholder={withVariables ? undefined : placeholder}
        className={cn(
          withVariables && "text-transparent caret-foreground",
          className
        )}
        autoComplete="off"
        onClick={syncCursor}
        onKeyUp={syncCursor}
        onSelect={syncCursor}
        onFocus={() => {
          setFocused(true)
          syncCursor()
        }}
        onBlur={() => {
          // Let mousedown on a suggestion apply before closing.
          window.setTimeout(() => setFocused(false), 150)
        }}
      />
      {withVariables ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex items-center overflow-hidden px-2 text-sm text-foreground md:text-xs/relaxed"
        >
          {value ? (
            <VariableText text={value} className="truncate whitespace-pre" />
          ) : placeholder ? (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          ) : null}
        </div>
      ) : null}
      {variableSuggestions.length > 0 ? (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
          {variableSuggestions.map((variable) => (
            <li key={`${variable.type}-${variable.name}`}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-start hover:bg-muted"
                onMouseDown={(event) => {
                  event.preventDefault()
                  insertVariable(variable.name)
                }}
              >
                <span className={VARIABLE_TEXT_CLASS}>{`{{${variable.name}}}`}</span>
                <span className="text-muted-foreground">{variable.type}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : historySuggestions.length > 0 ? (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                          {historySuggestions.map((option) => (
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
                                <VariableText
                                  text={option}
                                  className="truncate"
                                />
                              </button>
                            </li>
                          ))}
        </ul>
      ) : null}
    </div>
  )
}
