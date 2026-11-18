"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { VariableInput } from "@/components/variable/variable-input"
import { VariableText } from "@/components/variable/variable-text"
import { methodClass } from "@/lib/call/method-style"
import { previewLibraryImport } from "@/lib/library/api"
import { useConfirmLibraryImport } from "@/lib/library/hooks"
import type {
  LibraryImportCandidate,
  LibraryImportFormat,
  LibraryImportPreview,
} from "@/lib/library/types"
import { libraryVariables } from "@/lib/library/variables"
import { useGlobalVariables } from "@/lib/variable/hooks"
import { cn } from "@/lib/utils"
import {
  ArrowLeftIcon,
  FileUpIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useMemo, useRef, useState } from "react"

/** Same limit as the server: 2 MB of content. */
const MAX_CONTENT_BYTES = 2 * 1024 * 1024

const IMPORT_FORMATS: LibraryImportFormat[] = ["openapi", "postman", "curl"]

/**
 * Infer format from contents and filename. Minified OpenAPI/Postman often
 * has keys mid-line, so we avoid line-anchored checks.
 */
function detectFormat(
  content: string,
  fileName = ""
): LibraryImportFormat | null {
  const text = content.replace(/^\uFEFF/, "").trimStart()
  const name = fileName.toLowerCase()

  if (/^curl\b/i.test(text) || /(?:^|[\n;&|])\s*curl\s+/i.test(text)) {
    return "curl"
  }

  if (
    /"_postman_id"\s*:/i.test(text) ||
    /getpostman\.com\/json\/collection/i.test(text) ||
    /schema\.getpostman\.com/i.test(text) ||
    (/"item"\s*:/.test(text) &&
      /"info"\s*:/.test(text) &&
      /"schema"\s*:/.test(text))
  ) {
    return "postman"
  }

  if (
    /["']?openapi["']?\s*:/i.test(text) ||
    /["']?swagger["']?\s*:\s*["']?2(\.0)?["']?/i.test(text) ||
    (/"paths"\s*:/.test(text) &&
      (/"info"\s*:/.test(text) || /"components"\s*:/.test(text)))
  ) {
    return "openapi"
  }

  if (/postman|collection/i.test(name) && name.endsWith(".json")) {
    return "postman"
  }
  if (/openapi|swagger/i.test(name) || /\.(ya?ml)$/i.test(name)) {
    return "openapi"
  }
  if (/\.(sh|curl)$/i.test(name)) return "curl"

  return null
}

/** Prefer a guess, then fall back through every supported format. */
function formatsToTry(preferred: LibraryImportFormat | null): LibraryImportFormat[] {
  if (!preferred) return [...IMPORT_FORMATS]
  return [preferred, ...IMPORT_FORMATS.filter((format) => format !== preferred)]
}

function formatLabel(format: LibraryImportFormat) {
  if (format === "openapi") return "OpenAPI 3"
  if (format === "postman") return "Postman collection"
  return "cURL"
}

function isAbsoluteHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim())
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Absolute http(s), or a global variable template whose value is an absolute
 * http(s) URL (e.g. {{api_base}} → https://…). Secret globals are accepted
 * client-side; the API checks their decrypted value.
 */
function isUsableBaseUrl(
  value: string,
  globals: { name: string; value: string; secret?: boolean }[] = []
): boolean {
  const trimmed = value.trim().replace(/\/+$/, "")
  if (!trimmed || trimmed === "/") return false
  if (trimmed.startsWith("/") && !trimmed.includes("{{")) return false
  // OpenAPI server templates like https://{host} are not library variables.
  if (/\{[^{][^}]*\}/.test(trimmed) && !trimmed.includes("{{")) return false

  const refs = [
    ...trimmed.matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_-]*)\s*\}\}/g),
  ].map((match) => match[1])
  if (refs.length === 0) {
    return isAbsoluteHttpUrl(trimmed)
  }

  const byName = new Map(globals.map((global) => [global.name, global]))
  let resolved = trimmed
  for (const name of refs) {
    const global = byName.get(name)
    if (!global) return false
    if (global.secret) {
      resolved = resolved.replaceAll(
        new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, "g"),
        "https://placeholder.example"
      )
      continue
    }
    if (!global.value.trim()) return false
    resolved = resolved.replaceAll(
      new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, "g"),
      global.value
    )
  }
  return isAbsoluteHttpUrl(resolved)
}

/** Globals offered for the import base URL: URL-valued, or secret (API checks). */
function baseUrlVariables(
  globals: { name: string; value: string; secret?: boolean }[] | undefined
) {
  return libraryVariables(globals).filter(
    (variable) =>
      variable.secret || isAbsoluteHttpUrl(variable.value ?? "")
  )
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

/** Pull a usable server/base URL from OpenAPI, Swagger 2, or Postman JSON. */
function extractBaseUrl(content: string): string | null {
  try {
    const doc = JSON.parse(content) as Record<string, unknown>

    if (Array.isArray(doc.servers)) {
      for (const server of doc.servers) {
        if (!server || typeof server !== "object") continue
        const url = (server as { url?: unknown }).url
        if (typeof url === "string" && isUsableBaseUrl(url)) {
          return normalizeBaseUrl(url)
        }
      }
    }

    if (typeof doc.host === "string" && doc.host.trim()) {
      const schemes = Array.isArray(doc.schemes) ? doc.schemes : []
      const scheme =
        typeof schemes[0] === "string" && schemes[0]
          ? schemes[0]
          : "https"
      const basePath =
        typeof doc.basePath === "string" && doc.basePath !== "/"
          ? doc.basePath
          : ""
      const built = `${scheme}://${doc.host}${basePath}`
      if (isUsableBaseUrl(built)) return normalizeBaseUrl(built)
    }

    const variables = Array.isArray(doc.variable) ? doc.variable : []
    for (const variable of variables) {
      if (!variable || typeof variable !== "object") continue
      const entry = variable as { key?: unknown; value?: unknown }
      if (
        typeof entry.key === "string" &&
        /^(baseUrl|base_url|host|url)$/i.test(entry.key) &&
        typeof entry.value === "string" &&
        isUsableBaseUrl(entry.value)
      ) {
        return normalizeBaseUrl(entry.value)
      }
    }
  } catch {
    // YAML / non-JSON: take the first absolute server url if present.
    const yamlMatch = content.match(
      /(?:^|\n)\s*-\s*url:\s*["']?(https?:\/\/[^\s"'#]+)/i
    )
    if (yamlMatch?.[1] && isUsableBaseUrl(yamlMatch[1])) {
      return normalizeBaseUrl(yamlMatch[1])
    }
  }

  return null
}

/** True when the document has no absolute server/host of its own. */
function fileNeedsBaseUrl(content: string): boolean {
  if (extractBaseUrl(content)) return false

  try {
    const doc = JSON.parse(content) as Record<string, unknown>
    const isOpenApi =
      typeof doc.openapi === "string" ||
      typeof doc.swagger === "string" ||
      (doc.paths != null && typeof doc.paths === "object")

    if (!isOpenApi) return false

    if (Array.isArray(doc.servers) && doc.servers.length > 0) {
      return !doc.servers.some(
        (server) =>
          server &&
          typeof server === "object" &&
          typeof (server as { url?: unknown }).url === "string" &&
          isUsableBaseUrl((server as { url: string }).url)
      )
    }

    return true
  } catch {
    if (
      /^\s*openapi\s*:/m.test(content) ||
      /^\s*swagger\s*:/m.test(content)
    ) {
      return !/(?:^|\n)\s*-\s*url:\s*["']?https?:\/\//i.test(content)
    }
  }

  return false
}

/**
 * True when the call URL has no host of its own (path-only or {{base_url}}).
 * Path params like {{id}} do not make a base URL required.
 */
function callNeedsBaseUrl(url: string): boolean {
  const trimmed = url.trim()
  return (
    trimmed === "" ||
    trimmed.startsWith("{{base_url}}") ||
    trimmed.startsWith("/")
  )
}

function callsNeedBaseUrl(items: LibraryImportCandidate[]): boolean {
  return items.some((item) => callNeedsBaseUrl(item.payload.url ?? ""))
}

/**
 * Keep `{{global}}` for known globals; turn unknown `{{id}}` / `{id}`
 * into `[id]` path placeholders (not Uptime variables).
 */
function demoteUnknownVariables(
  url: string,
  knownNames: ReadonlySet<string>
): string {
  return url
    .replace(
      /\{\{\s*([A-Za-z_][A-Za-z0-9_-]*)\s*\}\}/g,
      (full, name: string) => (knownNames.has(name) ? full : `[${name}]`)
    )
    .replace(
      /(?<!\{)\{([A-Za-z_][A-Za-z0-9_-]*)\}(?!\})/g,
      (full, name: string) => (knownNames.has(name) ? full : `[${name}]`)
    )
}

function sanitizeImportCandidate(
  candidate: LibraryImportCandidate,
  knownNames: ReadonlySet<string>
): LibraryImportCandidate {
  const url = candidate.payload.url
  if (!url) return candidate
  const nextUrl = demoteUnknownVariables(url, knownNames)
  if (nextUrl === url) return candidate
  return {
    ...candidate,
    payload: { ...candidate.payload, url: nextUrl },
  }
}

function sanitizeImportPreview(
  preview: LibraryImportPreview,
  knownNames: ReadonlySet<string>
): LibraryImportPreview {
  return {
    ...preview,
    items: preview.items.map((item) =>
      sanitizeImportCandidate(item, knownNames)
    ),
  }
}

interface LibraryImportDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LibraryImportDrawer({
  open,
  onOpenChange,
}: LibraryImportDrawerProps) {
  const confirmMutation = useConfirmLibraryImport()
  const globalsQuery = useGlobalVariables()
  const variables = baseUrlVariables(globalsQuery.data)
  const globals = globalsQuery.data ?? []
  const knownVariableNames = useMemo(
    () => new Set(globals.map((global) => global.name)),
    [globals]
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [format, setFormat] = useState<LibraryImportFormat | null>(null)
  const [baseUrl, setBaseUrl] = useState("")
  const [baseUrlRequired, setBaseUrlRequired] = useState(false)
  const [preview, setPreview] = useState<LibraryImportPreview | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [names, setNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)

  const reset = () => {
    setFileName(null)
    setContent("")
    setFormat(null)
    setBaseUrl("")
    setBaseUrlRequired(false)
    setPreview(null)
    setSelected({})
    setNames({})
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    confirmMutation.reset()
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const clearFile = () => {
    setFileName(null)
    setContent("")
    setFormat(null)
    setBaseUrl("")
    setBaseUrlRequired(false)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_CONTENT_BYTES) {
      setError("This file is larger than 2 MB.")
      return
    }
    const text = await file.text()
    const extracted = extractBaseUrl(text)
    const needsBase = fileNeedsBaseUrl(text)
    setError(null)
    setFileName(file.name)
    setContent(text)
    setFormat(detectFormat(text, file.name))
    setBaseUrl(extracted ?? "")
    setBaseUrlRequired(needsBase)
  }

  const runPreview = async () => {
    setError(null)
    if (!content.trim()) {
      setError("Choose a file to import first.")
      return
    }
    const needsBase = baseUrlRequired || fileNeedsBaseUrl(content)
    const base = baseUrl.trim()
    if (needsBase && !isUsableBaseUrl(base, globals)) {
      setBaseUrlRequired(true)
      setError(
        base
          ? "Base URL variable must resolve to an absolute http(s) URL."
          : "Base URL is required because calls have no absolute URL."
      )
      return
    }
    const order = formatsToTry(format ?? detectFormat(content, fileName ?? ""))
    let lastMessage: string | null = null
    setPreviewing(true)
    try {
      for (const candidate of order) {
        try {
          const result = await previewLibraryImport({
            format: candidate,
            content,
            baseUrl: base || undefined,
          })
          if (result.items.length === 0 && order.indexOf(candidate) < order.length - 1) {
            // Empty parse — try the next format before giving up.
            lastMessage = "No calls found in this file."
            continue
          }
          const sanitized = sanitizeImportPreview(result, knownVariableNames)
          if (callsNeedBaseUrl(sanitized.items)) {
            setBaseUrlRequired(true)
            setError(
              "Base URL is required because calls have no absolute URL."
            )
            return
          }
          setFormat(candidate)
          setBaseUrlRequired(false)
          setPreview(sanitized)
          setSelected(
            Object.fromEntries(sanitized.items.map((c) => [c.key, true]))
          )
          setNames(
            Object.fromEntries(
              sanitized.items.map((c) => [c.key, c.payload.name])
            )
          )
          return
        } catch (err) {
          lastMessage =
            err instanceof Error ? err.message : "Failed to preview import"
        }
      }
      setError(lastMessage ?? "Could not import this file.")
    } finally {
      setPreviewing(false)
    }
  }

  const selectedCandidates: LibraryImportCandidate[] =
    preview?.items.filter((candidate) => selected[candidate.key]) ?? []

  const confirm = () => {
    setError(null)
    if (selectedCandidates.length === 0) {
      setError("Select at least one call to import.")
      return
    }
    if (callsNeedBaseUrl(selectedCandidates)) {
      setBaseUrlRequired(true)
      setPreview(null)
      setError("Base URL is required because calls have no absolute URL.")
      return
    }

    const items = selectedCandidates.map((candidate) => ({
      key: candidate.key,
      payload: {
        ...candidate.payload,
        name: names[candidate.key]?.trim() || candidate.payload.name,
      },
    }))
    const count = items.length
    const progressToast = toast.loading("Importing into your library", {
      description:
        count === 1
          ? "We are creating this call in the background. You can keep using the app — we will let you know when it is ready."
          : `We are creating ${count} calls in the background. You can keep using the app — we will let you know when they are ready.`,
    })
    handleOpenChange(false)

    confirmMutation.mutate(items, {
      onSuccess: (created) => {
        toast.dismiss(progressToast)
        toast.success("Library import finished", {
          description:
            created.length === 1
              ? "Your call is now available in the library. You can drag it onto a workflow canvas or open it to edit."
              : `All ${created.length} calls are now available in the library. You can drag them onto a workflow canvas or open them to edit.`,
        })
      },
      onError: (err) => {
        toast.dismiss(progressToast)
        toast.error("Library import could not be completed", {
          description:
            err instanceof Error
              ? err.message
              : "We could not add these calls to the library. Please try again, or check that the file and base URL are valid.",
        })
      },
    })
  }

  const busy = previewing || confirmMutation.isPending
  const message = error ?? confirmMutation.error?.message ?? null

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
              : "Upload an OpenAPI, Postman, or cURL file. Format is detected automatically."}
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
            <div className="space-y-2">
              <Label htmlFor="import-file">Import file</Label>
              <p className="text-xs text-muted-foreground">
                OpenAPI 3 (JSON / YAML), Postman collection v2.1, or cURL
                commands. Max 2 MB.
              </p>
              <input
                ref={fileInputRef}
                id="import-file"
                type="file"
                accept=".json,.yaml,.yml,.txt,.sh"
                className="sr-only"
                onChange={(event) => {
                  void onFile(event.target.files?.[0])
                }}
              />
              {fileName ? (
                <div className="flex h-24 w-full items-center gap-3 rounded-lg border bg-background px-4">
                  <FileUpIcon className="size-6 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{fileName}</p>
                    {format ? (
                      <p className="text-xs text-muted-foreground">
                        Detected as {formatLabel(format)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Format will be detected on preview
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove file"
                    onClick={clearFile}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-background px-4 text-center transition-colors hover:bg-muted/40"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUpIcon className="size-6 text-muted-foreground" />
                  <span className="text-sm font-medium">Choose a file</span>
                  <span className="text-xs text-muted-foreground">
                    .json, .yaml, .yml, .txt, .sh
                  </span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-base-url">
                Base URL
                {baseUrlRequired ? (
                  <span className="text-destructive"> *</span>
                ) : (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    (optional)
                  </span>
                )}
              </Label>
              <p className="text-xs text-muted-foreground">
                {baseUrlRequired
                  ? "Required — this file has no absolute server URL. Use https://… or a global whose value is an absolute URL."
                  : "Applied to calls without their own host. Use https://… or a global whose value is an absolute URL."}
              </p>
              <VariableInput
                id="import-base-url"
                value={baseUrl}
                onChange={(value) => {
                  setBaseUrl(value)
                  if (error) setError(null)
                }}
                variables={variables}
                placeholder="https://api.example.com or {{api_base}}"
                required={baseUrlRequired}
                aria-required={baseUrlRequired}
                className="h-9 bg-background dark:bg-background"
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
            <Button
              onClick={runPreview}
              disabled={
                busy ||
                !content.trim() ||
                (baseUrlRequired && !isUsableBaseUrl(baseUrl, globals))
              }
            >
              Preview
              {previewing ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Path-param placeholders are expected — no need to nag in the preview list. */
function isPathParamWarning(warning: { code: string; message: string }): boolean {
  return (
    warning.code === "variable_to_define" &&
    /Provide the value of \{\{.+?\}\} in the workflow/i.test(warning.message)
  )
}

function visibleWarnings(
  warnings: LibraryImportCandidate["warnings"]
): LibraryImportCandidate["warnings"] {
  return warnings.filter((warning) => !isPathParamWarning(warning))
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

      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-6 py-4">
        {preview.items.map((candidate) => {
          const method = (candidate.payload.method ?? "GET").toUpperCase()
          const isSelected = !!selected[candidate.key]
          const warnings = visibleWarnings(candidate.warnings)
          return (
            <li key={candidate.key}>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(value) =>
                    onToggle(candidate.key, value === true)
                  }
                  aria-label={`Import ${candidate.payload.name}`}
                  className="shrink-0"
                />
                <div
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium shadow-sm transition-opacity",
                    !isSelected && "opacity-45"
                  )}
                >
                  <span
                    title={method}
                    className={cn(
                      "inline-flex h-5 w-9 shrink-0 items-center justify-center rounded-md font-mono text-[9px] font-semibold",
                      methodClass(method)
                    )}
                  >
                    {method}
                  </span>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <Input
                      aria-label="Name"
                      value={names[candidate.key] ?? ""}
                      onChange={(event) =>
                        onRename(candidate.key, event.target.value)
                      }
                      maxLength={100}
                      className="h-5 border-0 bg-transparent px-0 text-xs font-medium shadow-none focus-visible:ring-0 dark:bg-transparent"
                    />
                    <span className="block truncate text-[11px] font-normal text-muted-foreground">
                      <VariableText text={candidate.payload.url || "—"} />
                    </span>
                  </div>
                </div>
              </div>
              {warnings.length > 0 ? (
                <ul className="mt-1.5 space-y-0.5 ps-9">
                  {warnings.map((warning, warningIndex) => (
                    <li
                      key={`${warning.code}-${warningIndex}`}
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
