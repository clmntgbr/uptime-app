"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { ApiError } from "@/lib/api-error"
import { upsertIncidentPolicy } from "@/lib/incident-policy/api"
import { useIncidentPolicies } from "@/lib/incident-policy/hooks"
import {
  INCIDENT_KIND_ORDER,
  INCIDENT_POLICY_LABELS,
  INCIDENT_PROFILES,
  SEVERITY_OPTIONS,
  applyProfile,
  detectProfile,
  estimateRunsHint,
  kindHelp,
  normalizePolicyParams,
  showsOpenClose,
} from "@/lib/incident-policy/registry"
import type { IncidentPolicy } from "@/lib/incident-policy/types"
import type { IncidentKind, IncidentSeverity } from "@/lib/incident/types"
import { cn } from "@/lib/utils"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

function policyKey(p: IncidentPolicy): string {
  return JSON.stringify({
    kind: p.kind,
    enabled: p.enabled,
    severity: p.severity,
    openAfter: p.openAfter,
    closeAfter: p.closeAfter,
    params: normalizePolicyParams(p.kind, p.params),
  })
}

function clonePolicies(list: IncidentPolicy[]): IncidentPolicy[] {
  return list.map((p) => ({
    ...p,
    params: { ...p.params },
  }))
}

function mergeServerPolicies(server: IncidentPolicy[]): IncidentPolicy[] {
  const byKind = new Map(server.map((p) => [p.kind, p]))
  return INCIDENT_KIND_ORDER.map((kind) => {
    const existing = byKind.get(kind)
    if (existing) {
      return {
        ...existing,
        kind,
        params: normalizePolicyParams(kind, existing.params ?? {}),
      }
    }
    return {
      kind,
      enabled: false,
      severity: "warning" as IncidentSeverity,
      openAfter: 3,
      closeAfter: 2,
      params: normalizePolicyParams(kind, {}),
    }
  })
}

export function IncidentPoliciesCard({
  workflowId,
  intervalSeconds,
  readOnly = false,
}: {
  workflowId: string
  intervalSeconds?: number
  readOnly?: boolean
}) {
  const titleId = useId()
  const query = useIncidentPolicies(workflowId)

  const [rows, setRows] = useState<IncidentPolicy[]>([])
  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rowErrors, setRowErrors] = useState<Partial<Record<IncidentKind, string>>>({})
  const baselineRef = useRef<Map<IncidentKind, string>>(new Map())

  useEffect(() => {
    if (!query.data) return
    const merged = mergeServerPolicies(query.data.policies ?? [])
    if (!initialized) {
      setRows(clonePolicies(merged))
      baselineRef.current = new Map(merged.map((p) => [p.kind, policyKey(p)]))
      setInitialized(true)
      return
    }
    const dirtyKinds = new Set(
      rows
        .filter((r) => baselineRef.current.get(r.kind) !== policyKey(r))
        .map((r) => r.kind)
    )
    if (dirtyKinds.size === 0) {
      setRows(clonePolicies(merged))
      baselineRef.current = new Map(merged.map((p) => [p.kind, policyKey(p)]))
      return
    }
    setRows((prev) =>
      prev.map((row) => {
        if (dirtyKinds.has(row.kind)) return row
        const fresh = merged.find((p) => p.kind === row.kind)
        return fresh ? { ...fresh, params: { ...fresh.params } } : row
      })
    )
    for (const p of merged) {
      if (!dirtyKinds.has(p.kind)) {
        baselineRef.current.set(p.kind, policyKey(p))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync from server payload
  }, [query.data, initialized])

  const activeProfile = useMemo(() => detectProfile(rows), [rows])
  const dirtyRows = useMemo(
    () => rows.filter((r) => baselineRef.current.get(r.kind) !== policyKey(r)),
    [rows]
  )
  const dirty = dirtyRows.length > 0

  const updateRow = (kind: IncidentKind, patch: Partial<IncidentPolicy>) => {
    setRows((prev) =>
      prev.map((r) => (r.kind === kind ? { ...r, ...patch } : r))
    )
    setRowErrors((prev) => {
      if (!prev[kind]) return prev
      const next = { ...prev }
      delete next[kind]
      return next
    })
  }

  const handleProfile = (profileId: (typeof INCIDENT_PROFILES)[number]["id"]) => {
    const profile = INCIDENT_PROFILES.find((p) => p.id === profileId)
    if (!profile) return
    setRows((prev) => applyProfile(prev, profile))
  }

  const handleSave = async () => {
    if (dirtyRows.length === 0) return
    setSaving(true)
    const results = await Promise.allSettled(
      dirtyRows.map((row) =>
        upsertIncidentPolicy(workflowId, row.kind, {
          enabled: row.enabled,
          severity: row.severity,
          openAfter: row.openAfter,
          closeAfter: row.closeAfter,
          params: normalizePolicyParams(row.kind, row.params),
        }).then((saved) => ({ kind: row.kind, saved }))
      )
    )

    let ok = 0
    const errors: Partial<Record<IncidentKind, string>> = {}
    const savedByKind = new Map<IncidentKind, IncidentPolicy>()

    results.forEach((result, index) => {
      const kind = dirtyRows[index].kind
      if (result.status === "fulfilled") {
        ok++
        savedByKind.set(kind, {
          ...result.value.saved,
          kind,
          params: normalizePolicyParams(kind, result.value.saved.params ?? {}),
        })
      } else {
        const err = result.reason
        errors[kind] =
          err instanceof ApiError ? err.message : "Failed to save"
      }
    })

    setRows((prev) =>
      prev.map((row) => {
        const saved = savedByKind.get(row.kind)
        return saved ? { ...saved, params: { ...saved.params } } : row
      })
    )
    for (const [kind, saved] of savedByKind) {
      baselineRef.current.set(kind, policyKey(saved))
    }
    setRowErrors(errors)
    setSaving(false)

    const total = dirtyRows.length
    if (ok === total) {
      toast.success("Saved")
      void query.refetch()
    } else if (ok === 0) {
      toast.error("Failed to save incident policies")
    } else {
      toast.message(`${ok} of ${total} saved`)
    }
  }

  if (query.isLoading) {
    return (
      <Card id="workflow-incident-policies">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (query.isError) {
    return (
      <Card id="workflow-incident-policies">
        <CardHeader>
          <CardTitle>Incidents</CardTitle>
          <CardDescription>Failed to load incident policies.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card id="workflow-incident-policies">
      <CardHeader>
        <CardTitle id={titleId}>Incidents</CardTitle>
        <CardDescription>
          When an incident opens and closes, by type.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          role="radiogroup"
          aria-label="Incident sensitivity profile"
          className="flex flex-wrap gap-2"
        >
          {INCIDENT_PROFILES.map((profile) => {
            const checked = activeProfile === profile.id
            return (
              <button
                key={profile.id}
                type="button"
                role="radio"
                aria-checked={checked}
                disabled={readOnly}
                onClick={() => handleProfile(profile.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-sm transition-colors",
                  checked
                    ? "border-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {profile.label}
              </button>
            )
          })}
          {activeProfile === "custom" ? (
            <span className="rounded-md border border-dashed px-2.5 py-1 text-sm text-muted-foreground">
              Custom
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-3" aria-live="polite">
          {rows.map((row) => (
            <PolicyRow
              key={row.kind}
              row={row}
              intervalSeconds={intervalSeconds}
              readOnly={readOnly}
              error={rowErrors[row.kind]}
              onChange={(patch) => updateRow(row.kind, patch)}
            />
          ))}
        </div>
      </CardContent>
      {!readOnly && (
        <CardFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Changes apply to upcoming runs. Open incidents stay open; Close after
            uses the next successful runs.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!dirty || saving}
              onClick={() => {
                if (!query.data) return
                const merged = mergeServerPolicies(query.data.policies ?? [])
                setRows(clonePolicies(merged))
                baselineRef.current = new Map(
                  merged.map((p) => [p.kind, policyKey(p)])
                )
                setRowErrors({})
              }}
            >
              Reset
            </Button>
            <Button
              type="button"
              disabled={!dirty || saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

function PolicyRow({
  row,
  intervalSeconds,
  readOnly,
  error,
  onChange,
}: {
  row: IncidentPolicy
  intervalSeconds?: number
  readOnly?: boolean
  error?: string
  onChange: (patch: Partial<IncidentPolicy>) => void
}) {
  const showCounters = showsOpenClose(row.kind)
  const help = kindHelp(row.kind)
  const label = INCIDENT_POLICY_LABELS[row.kind]

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">{label}</p>
          {help ? (
            <p className="text-xs text-muted-foreground">{help}</p>
          ) : null}
        </div>
        <Switch
          checked={row.enabled}
          disabled={readOnly}
          onCheckedChange={(enabled) => onChange({ enabled })}
          aria-label={`${label} enabled`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Severity</Label>
          <Select
            value={row.severity}
            disabled={readOnly}
            onValueChange={(value) =>
              onChange({ severity: value as IncidentSeverity })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {row.kind === "availability_low" ? (
          <>
            <NumberField
              label="Threshold (%)"
              value={row.params.threshold ?? 99}
              min={0}
              max={100}
              step={0.1}
              disabled={readOnly}
              onChange={(threshold) =>
                onChange({ params: { ...row.params, threshold } })
              }
            />
            <NumberField
              label="Recovery threshold (%)"
              value={row.params.recoveryThreshold ?? 99.5}
              min={0}
              max={100}
              step={0.1}
              disabled={readOnly}
              onChange={(recoveryThreshold) =>
                onChange({ params: { ...row.params, recoveryThreshold } })
              }
            />
          </>
        ) : null}

        {row.kind === "no_run" ? (
          <NumberField
            label="Multiplier"
            value={row.params.multiplier ?? 3}
            min={1}
            max={20}
            step={1}
            disabled={readOnly}
            onChange={(multiplier) =>
              onChange({ params: { ...row.params, multiplier } })
            }
          />
        ) : null}

        {showCounters ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor={`open-${row.kind}`}>
                Open after, failing runs, {label}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`open-${row.kind}`}
                  type="number"
                  min={1}
                  max={20}
                  value={row.openAfter}
                  disabled={readOnly}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (!Number.isFinite(n)) return
                    onChange({ openAfter: Math.min(20, Math.max(1, Math.round(n))) })
                  }}
                  className="max-w-24"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  failing runs
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {estimateRunsHint(row.openAfter, intervalSeconds, "open")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`close-${row.kind}`}>
                Close after, successful runs, {label}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`close-${row.kind}`}
                  type="number"
                  min={1}
                  max={20}
                  value={row.closeAfter}
                  disabled={readOnly}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (!Number.isFinite(n)) return
                    onChange({ closeAfter: Math.min(20, Math.max(1, Math.round(n))) })
                  }}
                  className="max-w-24"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  successful runs
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {estimateRunsHint(row.closeAfter, intervalSeconds, "close")}
              </p>
            </div>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isFinite(n)) return
          onChange(n)
        }}
      />
    </div>
  )
}
