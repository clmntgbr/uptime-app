"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { methodClass } from "@/lib/call/method-style"
import {
  useConfirmLibraryImport,
  usePreviewLibraryImport,
} from "@/lib/library/hooks"
import type {
  LibraryImportCandidate,
  LibraryImportFormat,
  LibraryImportPreview,
} from "@/lib/library/types"
import { cn } from "@/lib/utils"
import { ArrowLeftIcon, Loader2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

/** Same limits as the server: 2 MB of content, 500 items per confirmation. */
const MAX_CONTENT_BYTES = 2 * 1024 * 1024
const MAX_IMPORT_ITEMS = 500

const FORMATS: { value: LibraryImportFormat; label: string }[] = [
  { value: "openapi", label: "OpenAPI 3 (JSON / YAML)" },
  { value: "postman", label: "Postman collection v2.1" },
  { value: "curl", label: "cURL command(s)" },
]

/** Best guess from the pasted text; the user can always change it. */
function detectFormat(content: string): LibraryImportFormat | null {
  const text = content.trimStart()
  if (/^curl\s/i.test(text)) return "curl"
  if (/"_postman_id"|getpostman\.com\/json\/collection|"item"\s*:/.test(text)) {
    return "postman"
  }
  if (/^\s*"?openapi"?\s*:/m.test(text)) return "openapi"
  return null
}

interface LibraryImportDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LibraryImportDrawer({
  open,
  onOpenChange,
}: LibraryImportDrawerProps) {
  const previewMutation = usePreviewLibraryImport()
  const confirmMutation = useConfirmLibraryImport()
  const [format, setFormat] = useState<LibraryImportFormat>("openapi")
  const [content, setContent] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [preview, setPreview] = useState<LibraryImportPreview | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [names, setNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setContent("")
    setBaseUrl("")
    setPreview(null)
    setSelected({})
    setNames({})
    setError(null)
    previewMutation.reset()
    confirmMutation.reset()
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const applyContent = (text: string) => {
    setContent(text)
    const detected = detectFormat(text)
    if (detected) setFormat(detected)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_CONTENT_BYTES) {
      setError("This file is larger than 2 MB.")
      return
    }
    setError(null)
    applyContent(await file.text())
  }

  const runPreview = async () => {
    setError(null)
    if (!content.trim()) {
      setError("Paste a document or choose a file first.")
      return
    }
    try {
      const result = await previewMutation.mutateAsync({
        format,
        content,
        baseUrl: baseUrl.trim() || undefined,
      })
      setPreview(result)
      setSelected(Object.fromEntries(result.items.map((c) => [c.key, true])))
      setNames(
        Object.fromEntries(result.items.map((c) => [c.key, c.payload.name]))
      )
    } catch {
      // Shown through the mutation error.
    }
  }

  const selectedCandidates: LibraryImportCandidate[] =
    preview?.items.filter((candidate) => selected[candidate.key]) ?? []

  const confirm = async () => {
    setError(null)
    if (selectedCandidates.length === 0) {
      setError("Select at least one call to import.")
      return
    }
    if (selectedCandidates.length > MAX_IMPORT_ITEMS) {
      setError(`Import at most ${MAX_IMPORT_ITEMS} calls at once.`)
      return
    }
    try {
      const created = await confirmMutation.mutateAsync(
        selectedCandidates.map((candidate) => ({
          key: candidate.key,
          payload: {
            ...candidate.payload,
            name: names[candidate.key]?.trim() || candidate.payload.name,
          },
        }))
      )
      toast.success(
        `Imported ${created.length} call${created.length > 1 ? "s" : ""}`
      )
      handleOpenChange(false)
    } catch {
      // Shown through the mutation error.
    }
  }

  const busy = previewMutation.isPending || confirmMutation.isPending
  const message =
    error ??
    previewMutation.error?.message ??
    confirmMutation.error?.message ??
    null

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        nested
        showCloseButton
        className="flex h-full w-[min(48rem,92vw)]! max-w-[92vw]! flex-col gap-0 p-0 sm:max-w-[min(48rem,92vw)]!"
      >
        <SheetHeader className="gap-1 border-b px-6 py-5 pe-12">
          <SheetTitle>Import into library</SheetTitle>
          <SheetDescription>
            {preview
              ? "Review the calls found, then import the selected ones."
              : "Paste or upload an OpenAPI document, a Postman collection, or cURL commands."}
          </SheetDescription>
        </SheetHeader>

        {preview ? (
          <ReviewStep
            preview={preview}
            selected={selected}
            names={names}
            onToggle={(key, value) =>
              setSelected((current) => ({ ...current, [key]: value }))
            }
            onRename={(key, value) =>
              setNames((current) => ({ ...current, [key]: value }))
            }
            onSelectAll={(value) =>
              setSelected(
                Object.fromEntries(preview.items.map((c) => [c.key, value]))
              )
            }
          />
        ) : (
          <div className="min-h-0 flex-1 space-y-6 overflow-auto px-6 py-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="import-format">Format</Label>
                <Select
                  value={format}
                  onValueChange={(value) =>
                    setFormat(value as LibraryImportFormat)
                  }
                >
                  <SelectTrigger id="import-format" className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="import-base-url">Base URL (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Applied to calls without their own host, e.g.{" "}
                  https://api.example.com/v1
                </p>
                <Input
                  id="import-base-url"
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="https://api.example.com"
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="import-content">Content</Label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <UploadIcon className="size-3.5" />
                  Choose a file
                  <input
                    type="file"
                    accept=".json,.yaml,.yml,.txt,.sh"
                    className="sr-only"
                    onChange={(event) => {
                      void onFile(event.target.files?.[0])
                      event.target.value = ""
                    }}
                  />
                </label>
              </div>
              <Textarea
                id="import-content"
                value={content}
                onChange={(event) => applyContent(event.target.value)}
                placeholder={
                  "curl https://api.example.com/health\n\nor the content of an openapi.yaml / collection.json"
                }
                rows={16}
                className="font-mono text-xs"
              />
            </div>
          </div>
        )}

        {message ? (
          <p className="px-6 pb-2 text-sm text-destructive">{message}</p>
        ) : null}

        <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-background px-6 py-4">
          {preview ? (
            <Button
              variant="outline"
              onClick={() => setPreview(null)}
              disabled={busy}
            >
              <ArrowLeftIcon className="size-4" />
              Back
            </Button>
          ) : (
            <span />
          )}
          {preview ? (
            <Button onClick={confirm} disabled={busy}>
              Import {selectedCandidates.length}
              {confirmMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
            </Button>
          ) : (
            <Button onClick={runPreview} disabled={busy}>
              Preview
              {previewMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ReviewStep({
  preview,
  selected,
  names,
  onToggle,
  onRename,
  onSelectAll,
}: {
  preview: LibraryImportPreview
  selected: Record<string, boolean>
  names: Record<string, string>
  onToggle: (key: string, value: boolean) => void
  onRename: (key: string, value: string) => void
  onSelectAll: (value: boolean) => void
}) {
  const selectedCount = preview.items.filter((c) => selected[c.key]).length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b px-6 py-3 text-sm">
        <p className="text-muted-foreground">
          {preview.items.length} found · {selectedCount} selected
          {preview.skipped.length > 0
            ? ` · ${preview.skipped.length} skipped`
            : ""}
        </p>
        <div className="flex gap-3 text-xs">
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => onSelectAll(true)}
          >
            Select all
          </button>
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => onSelectAll(false)}
          >
            Select none
          </button>
        </div>
      </div>

      <ul className="min-h-0 flex-1 divide-y overflow-auto">
        {preview.items.map((candidate) => {
          const method = (candidate.payload.method ?? "GET").toUpperCase()
          const isSelected = !!selected[candidate.key]
          return (
            <li
              key={candidate.key}
              className={cn(
                "flex gap-3 px-6 py-3",
                !isSelected && "opacity-60"
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={(value) =>
                  onToggle(candidate.key, value === true)
                }
                aria-label={`Import ${candidate.payload.name}`}
                className="mt-2"
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex h-5 w-11 shrink-0 items-center justify-center rounded font-mono text-[10px] font-semibold",
                      methodClass(method)
                    )}
                  >
                    {method}
                  </span>
                  <Input
                    aria-label="Name"
                    value={names[candidate.key] ?? ""}
                    onChange={(event) =>
                      onRename(candidate.key, event.target.value)
                    }
                    maxLength={100}
                    className="h-7 text-xs"
                  />
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {candidate.payload.url || "—"}
                </p>
                {candidate.warnings.length > 0 ? (
                  <ul className="space-y-0.5">
                    {candidate.warnings.map((warning, index) => (
                      <li
                        key={`${warning.code}-${index}`}
                        className={cn(
                          "text-[11px]",
                          warning.code === "sensitive_header"
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      {preview.skipped.length > 0 ? (
        <details className="border-t px-6 py-3 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            {preview.skipped.length} skipped
          </summary>
          <ul className="mt-2 space-y-1">
            {preview.skipped.map((item, index) => (
              <li key={`${item.source}-${index}`}>
                <span className="font-medium">{item.source}</span>
                <span className="text-muted-foreground"> — {item.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}
