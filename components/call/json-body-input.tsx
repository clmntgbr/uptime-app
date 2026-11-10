"use client"

import { Button } from "@/components/ui/button"
import { VARIABLE_TEXT_CLASS } from "@/components/variable/variable-text"
import type { AvailableVariable } from "@/lib/variable/types"
import { cn } from "@/lib/utils"
import {
  AlertTriangleIcon,
  ListChevronsDownUpIcon,
  ListChevronsUpDownIcon,
  WandSparklesIcon,
} from "lucide-react"
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function highlightJsonSegment(segment: string): string {
  return segment.replace(
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (match, quoted, keySuffix, primitive) => {
      if (quoted !== undefined) {
        if (keySuffix) {
          return `<span class="text-red-600 dark:text-red-400">${quoted}</span>${keySuffix}`
        }
        return `<span class="text-emerald-700 dark:text-emerald-400">${quoted}</span>`
      }
      if (primitive === "true" || primitive === "false") {
        return `<span class="text-amber-700 dark:text-amber-400">${match}</span>`
      }
      if (primitive === "null") {
        return `<span class="text-rose-700 dark:text-rose-400">${match}</span>`
      }
      return `<span class="text-sky-700 dark:text-sky-300">${match}</span>`
    }
  )
}

function highlightJsonText(text: string): string {
  const escaped = escapeHtml(text)
  return escaped
    .split(/(\{\{[^}]+\}\})/g)
    .map((part) =>
      part.startsWith("{{")
        ? `<span class="${VARIABLE_TEXT_CLASS}">${part}</span>`
        : highlightJsonSegment(part)
    )
    .join("")
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

const CARET_MIRROR_STYLES = [
  "direction",
  "boxSizing",
  "width",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
  "MozTabSize",
  "whiteSpace",
  "wordWrap",
  "wordBreak",
] as const

/** Caret pixel offset inside a textarea (content coordinates). */
function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number
): { top: number; left: number; height: number } {
  const style = window.getComputedStyle(element)
  const mirror = document.createElement("div")
  mirror.style.position = "absolute"
  mirror.style.visibility = "hidden"
  mirror.style.whiteSpace = "pre-wrap"
  mirror.style.overflowWrap = "break-word"
  mirror.style.top = "0"
  mirror.style.left = "-9999px"

  for (const property of CARET_MIRROR_STYLES) {
    // Copy computed styles onto the mirror so wrapped lines match the textarea.
    mirror.style[property] = style[property]
  }

  mirror.textContent = element.value.slice(0, position)
  const marker = document.createElement("span")
  marker.textContent = element.value.slice(position) || "."
  mirror.appendChild(marker)
  document.body.appendChild(mirror)

  const coordinates = {
    top: marker.offsetTop,
    left: marker.offsetLeft,
    height: Number.parseFloat(style.lineHeight) || marker.offsetHeight,
  }
  document.body.removeChild(mirror)
  return coordinates
}

export function JsonBodyInput({
  value,
  onChange,
  title = "Body",
  className,
  editorClassName,
  variables = [],
}: {
  value: string
  onChange: (value: string) => void
  title?: string
  className?: string
  editorClassName?: string
  variables?: AvailableVariable[]
}) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const highlightedRef = useRef<HTMLPreElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  )
  const [scrollVersion, setScrollVersion] = useState(0)

  const validate = useCallback((text: string) => {
    if (text.trim() === "") {
      setError(null)
      return
    }
    try {
      JSON.parse(text)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON")
    }
  }, [])

  const handleChange = (text: string) => {
    onChange(text)
    validate(text)
  }

  const handleFormat = () => {
    if (value.trim() === "") {
      setError(null)
      return
    }
    try {
      const formatted = JSON.stringify(JSON.parse(value), null, 2)
      onChange(formatted)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON")
    }
  }

  const handleCollapse = () => {
    if (value.trim() === "") {
      setError(null)
      return
    }
    try {
      const collapsed = JSON.stringify(JSON.parse(value))
      onChange(collapsed)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON")
    }
  }

  const handleExpand = () => {
    handleFormat()
  }

  const handleScroll = () => {
    const editor = editorRef.current
    const highlighted = highlightedRef.current
    if (!editor || !highlighted) return
    highlighted.scrollTop = editor.scrollTop
    highlighted.scrollLeft = editor.scrollLeft
    setScrollVersion((version) => version + 1)
  }

  const syncCursor = () => {
    const next = editorRef.current?.selectionStart ?? value.length
    setCursor(next)
  }

  const trigger =
    focused && variables.length > 0 ? getVariableTrigger(value, cursor) : null
  const query = trigger?.query.toLowerCase() ?? ""
  const suggestions = trigger
    ? variables.filter((variable) =>
        variable.name.toLowerCase().includes(query)
      )
    : []

  const triggerStart = trigger?.start
  const showSuggestions = Boolean(trigger) && suggestions.length > 0

  useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editor || triggerStart === undefined || !showSuggestions) {
      setMenuPos((prev) => (prev === null ? prev : null))
      return
    }

    const caret = getCaretCoordinates(editor, triggerStart)
    const maxLeft = Math.max(8, editor.clientWidth - 220)
    const next = {
      top: caret.top - editor.scrollTop + caret.height + 4,
      left: Math.min(Math.max(8, caret.left - editor.scrollLeft), maxLeft),
    }
    setMenuPos((prev) =>
      prev && prev.top === next.top && prev.left === next.left ? prev : next
    )
  }, [cursor, scrollVersion, showSuggestions, triggerStart, value])

  const insertVariable = (name: string) => {
    if (!trigger) return
    const insertion = `{{${name}}}`
    const next = value.slice(0, trigger.start) + insertion + value.slice(cursor)
    handleChange(next)
    setFocused(false)

    const caret = trigger.start + insertion.length
    requestAnimationFrame(() => {
      const editor = editorRef.current
      if (!editor) return
      editor.focus()
      editor.setSelectionRange(caret, caret)
      setCursor(caret)
      setFocused(true)
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Tab" && suggestions.length > 0 && !event.shiftKey) {
      event.preventDefault()
      insertVariable(suggestions[0].name)
      return
    }

    if (event.key !== "Tab" || event.shiftKey) return
    event.preventDefault()

    const editor = event.currentTarget
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const indent = "    "
    const next = value.slice(0, start) + indent + value.slice(end)
    handleChange(next)

    requestAnimationFrame(() => {
      const caret = start + indent.length
      editor.setSelectionRange(caret, caret)
      setCursor(caret)
    })
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-background text-sm shadow-none",
        className
      )}
    >
      <div className="flex items-center justify-between rounded-t-xl border-b bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-rose-500" />
          <div className="size-3 rounded-full bg-amber-500" />
          <div className="size-3 rounded-full bg-emerald-500" />
          <span className="ml-3 text-xs text-muted-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCollapse}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Collapse JSON"
          >
            <ListChevronsDownUpIcon className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleExpand}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Expand JSON"
          >
            <ListChevronsUpDownIcon className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleFormat}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Format JSON"
          >
            <WandSparklesIcon className="size-3" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        className={cn(
          "relative rounded-b-xl bg-background",
          suggestions.length > 0 ? "overflow-visible" : "overflow-hidden"
        )}
      >
        <pre
          ref={highlightedRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-auto px-4 py-3 font-mono text-sm leading-6 wrap-break-word whitespace-pre-wrap text-foreground"
          dangerouslySetInnerHTML={{
            __html: highlightJsonText(value) || " ",
          }}
        />
        <textarea
          ref={editorRef}
          value={value}
          onChange={(event) => {
            handleChange(event.target.value)
            setCursor(event.target.selectionStart ?? event.target.value.length)
          }}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
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
          spellCheck={false}
          placeholder='{"key":"value"}'
          className={cn(
            "relative w-full resize-y overflow-auto bg-transparent px-4 py-3 font-mono text-sm leading-6 text-transparent caret-foreground outline-none placeholder:text-muted-foreground",
            editorClassName ?? "min-h-40"
          )}
        />
        {suggestions.length > 0 && menuPos ? (
          <ul
            className="absolute z-30 max-h-40 min-w-48 overflow-y-auto rounded-md border bg-popover shadow-md"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {suggestions.map((variable) => (
              <li key={`${variable.type}-${variable.name}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-start font-sans text-sm hover:bg-muted"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    insertVariable(variable.name)
                  }}
                >
                  <span className={VARIABLE_TEXT_CLASS}>
                    {`{{${variable.name}}}`}
                  </span>
                  <span className="text-muted-foreground">{variable.type}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
