"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  AlertTriangleIcon,
  ListChevronsDownUpIcon,
  ListChevronsUpDownIcon,
  WandSparklesIcon,
} from "lucide-react"
import { useCallback, useRef, useState } from "react"

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
          return `<span class="text-red-400">${quoted}</span>${keySuffix}`
        }
        return `<span class="text-emerald-400">${quoted}</span>`
      }
      if (primitive === "true" || primitive === "false") {
        return `<span class="text-amber-400">${match}</span>`
      }
      if (primitive === "null") {
        return `<span class="text-rose-400">${match}</span>`
      }
      return `<span class="text-sky-300">${match}</span>`
    }
  )
}

function highlightJsonText(text: string): string {
  const escaped = escapeHtml(text)
  // Dark editor: sky-400 matches call-list variable emphasis on dark bg.
  const variableClass = "font-semibold text-sky-400"
  return escaped
    .split(/(\{\{[^}]+\}\})/g)
    .map((part) =>
      part.startsWith("{{")
        ? `<span class="${variableClass}">${part}</span>`
        : highlightJsonSegment(part)
    )
    .join("")
}

export function JsonBodyInput({
  value,
  onChange,
  title = "Body",
  className,
  editorClassName,
}: {
  value: string
  onChange: (value: string) => void
  title?: string
  className?: string
  editorClassName?: string
}) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const highlightedRef = useRef<HTMLPreElement | null>(null)
  const [error, setError] = useState<string | null>(null)

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
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-sm shadow-none",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-rose-500" />
          <div className="size-3 rounded-full bg-amber-500" />
          <div className="size-3 rounded-full bg-emerald-500" />
          <span className="ml-3 text-xs text-slate-400">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCollapse}
            className="text-white hover:bg-slate-700 hover:text-white"
            aria-label="Collapse JSON"
          >
            <ListChevronsDownUpIcon className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleExpand}
            className="text-white hover:bg-slate-700 hover:text-white"
            aria-label="Expand JSON"
          >
            <ListChevronsUpDownIcon className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleFormat}
            className="text-white hover:bg-slate-700 hover:text-white"
            aria-label="Format JSON"
          >
            <WandSparklesIcon className="size-3" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 border-b border-rose-800/50 bg-rose-950/50 px-4 py-3 text-xs text-rose-400">
          <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative">
        <pre
          ref={highlightedRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-auto px-4 py-3 font-mono text-sm leading-6 wrap-break-word whitespace-pre-wrap text-slate-300"
          dangerouslySetInnerHTML={{
            __html: highlightJsonText(value) || " ",
          }}
        />
        <textarea
          ref={editorRef}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          placeholder='{"key":"value"}'
          className={cn(
            "relative w-full resize-y overflow-auto bg-transparent px-4 py-3 font-mono text-sm leading-6 text-transparent caret-slate-100 outline-none placeholder:text-slate-500",
            editorClassName ?? "min-h-40"
          )}
        />
      </div>
    </div>
  )
}
