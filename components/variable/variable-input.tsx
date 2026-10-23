"use client"

import { Input } from "@/components/ui/input"
import {
  VARIABLE_TEXT_CLASS,
  VariableText,
} from "@/components/variable/variable-text"
import { AvailableVariable } from "@/lib/variable/types"
import { cn } from "@/lib/utils"
import { useRef, useState } from "react"

interface VariableInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "onChange" | "value"
> {
  value: string
  onChange: (value: string) => void
  variables: AvailableVariable[]
}

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

export function VariableInput({
  value,
  onChange,
  variables,
  onBlur,
  onFocus,
  className,
  placeholder,
  ...props
}: VariableInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [cursor, setCursor] = useState(0)

  const trigger = focused ? getVariableTrigger(value, cursor) : null
  const query = trigger?.query.toLowerCase() ?? ""
  const suggestions = trigger
    ? variables.filter((variable) =>
        variable.name.toLowerCase().includes(query)
      )
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
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Input
          {...props}
          ref={inputRef}
          value={value}
          placeholder={undefined}
          autoComplete="off"
          className={cn("text-transparent caret-foreground", className)}
          onChange={(event) => {
            onChange(event.target.value)
            setCursor(event.target.selectionStart ?? event.target.value.length)
          }}
          onClick={syncCursor}
          onKeyUp={syncCursor}
          onSelect={syncCursor}
          onFocus={(event) => {
            setFocused(true)
            syncCursor()
            onFocus?.(event)
          }}
          onBlur={(event) => {
            // Let mousedown on a suggestion apply before closing.
            window.setTimeout(() => setFocused(false), 150)
            onBlur?.(event)
          }}
        />
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
      </div>
      {suggestions.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded-md border bg-popover">
          {suggestions.map((variable) => (
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
      )}
    </div>
  )
}
