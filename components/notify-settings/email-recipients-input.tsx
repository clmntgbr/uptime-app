"use client"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { XIcon } from "lucide-react"
import { useId, useState } from "react"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAILS = 20

function splitCandidates(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
}

export function EmailRecipientsInput({
  emails,
  onChange,
  readOnly = false,
  label = "Recipients",
  emptyWarning = "No one will be notified about this workflow.",
  id,
}: {
  emails: string[]
  onChange: (emails: string[]) => void
  readOnly?: boolean
  label?: string
  emptyWarning?: string
  id?: string
}) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [draft, setDraft] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)

  const commit = (raw: string) => {
    const candidates = splitCandidates(raw)
    if (candidates.length === 0) return

    let next = [...emails]
    let invalid: string | null = null
    for (const value of candidates) {
      if (!EMAIL_RE.test(value)) {
        invalid = value
        continue
      }
      if (next.includes(value)) continue
      if (next.length >= MAX_EMAILS) {
        setFieldError("At most 20 emails")
        setDraft(invalid ?? "")
        return
      }
      next.push(value)
    }
    onChange(next)
    if (invalid) {
      setDraft(invalid)
      setFieldError("Not a valid email address.")
      return
    }
    setDraft("")
    setFieldError(null)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-wrap gap-1.5 min-h-8">
        {emails.map((email) => (
          <Badge key={email} variant="secondary" className="gap-1 pr-1">
            {email}
            {!readOnly && (
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                onClick={() => onChange(emails.filter((e) => e !== email))}
                aria-label={`Remove ${email}`}
              >
                <XIcon className="size-3" />
              </button>
            )}
          </Badge>
        ))}
        {emails.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-500" role="status">
            {emptyWarning}
          </p>
        )}
      </div>
      {!readOnly && (
        <Input
          id={inputId}
          type="text"
          inputMode="email"
          autoComplete="email"
          value={draft}
          placeholder="name@company.com"
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? `${inputId}-error` : undefined}
          onChange={(e) => {
            setDraft(e.target.value)
            setFieldError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === " ") {
              e.preventDefault()
              commit(draft)
            }
            if (e.key === "Backspace" && draft === "" && emails.length > 0) {
              onChange(emails.slice(0, -1))
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text")
            if (/[\s,;]/.test(text)) {
              e.preventDefault()
              commit(text)
            }
          }}
          onBlur={() => {
            if (draft.trim()) commit(draft)
          }}
        />
      )}
      {fieldError && (
        <p id={`${inputId}-error`} className="text-sm text-destructive" role="alert">
          {fieldError}
        </p>
      )}
    </div>
  )
}
