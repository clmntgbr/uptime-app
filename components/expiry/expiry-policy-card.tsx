"use client"

import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { ApiError } from "@/lib/api-error"
import {
  EXPIRY_MAX_THRESHOLDS,
  EXPIRY_SHORTCUTS,
  EXPIRY_TYPES,
} from "@/lib/expiry/registry"
import {
  useExpiryPolicies,
  useUpsertExpiryPolicy,
} from "@/lib/expiry/hooks"
import type { ExpiryPolicy, ExpiryType } from "@/lib/expiry/types"
import { cn } from "@/lib/utils"
import { XIcon } from "lucide-react"
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

export type ExpiryPolicyCardHandle = {
  save: () => Promise<void>
}

function sameDays(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

function sortDaysDesc(days: number[]) {
  return [...days].sort((a, b) => b - a)
}

/** Form snapshot only (no updatedAt) — used for local dirty detection. */
function formSnapshot(enabled: boolean, thresholdsDays: number[]) {
  return JSON.stringify({
    enabled,
    thresholdsDays: sortDaysDesc(thresholdsDays),
  })
}

function serverSnapshot(
  policy: Pick<ExpiryPolicy, "enabled" | "thresholdsDays" | "updatedAt">
) {
  return JSON.stringify({
    enabled: policy.enabled,
    thresholdsDays: sortDaysDesc(policy.thresholdsDays),
    updatedAt: policy.updatedAt ?? null,
  })
}

export const ExpiryPolicyCard = forwardRef<
  ExpiryPolicyCardHandle,
  {
    workflowId: string
    type: ExpiryType
    readOnly?: boolean
    /** Hide Reset/Save — parent form saves via ref. */
    hideActions?: boolean
  }
>(function ExpiryPolicyCard(
  { workflowId, type, readOnly = false, hideActions = false },
  ref
) {
  const titleId = useId()
  const meta = EXPIRY_TYPES[type]
  const policiesQuery = useExpiryPolicies(workflowId)
  const saveMutation = useUpsertExpiryPolicy(workflowId)

  const serverPolicy = useMemo((): ExpiryPolicy | undefined => {
    if (!policiesQuery.data) return undefined
    return (
      (policiesQuery.data.policies ?? []).find(
        (policy) => policy.type === type
      ) ?? {
        type,
        enabled: false,
        thresholdsDays: [],
      }
    )
  }, [policiesQuery.data, type])

  const [enabled, setEnabled] = useState(false)
  const [thresholds, setThresholds] = useState<number[]>([])
  const [draft, setDraft] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [flashDay, setFlashDay] = useState<number | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [remoteChanged, setRemoteChanged] = useState(false)
  const [saveNetworkError, setSaveNetworkError] = useState(false)
  const lastServerRef = useRef<string>("")
  const appliedFormRef = useRef<string>("")
  const formRef = useRef({ enabled, thresholds })
  formRef.current = { enabled, thresholds }

  const applyPolicy = (policy: ExpiryPolicy) => {
    const days = sortDaysDesc(policy.thresholdsDays)
    setEnabled(policy.enabled)
    setThresholds(days)
    setRemoteChanged(false)
    setFieldError(null)
    setDraft("")
    setSaveNetworkError(false)
    lastServerRef.current = serverSnapshot(policy)
    appliedFormRef.current = formSnapshot(policy.enabled, days)
  }

  useEffect(() => {
    if (!serverPolicy) return
    const serialized = serverSnapshot(serverPolicy)

    if (!initialized) {
      applyPolicy(serverPolicy)
      setInitialized(true)
      return
    }

    if (serialized === lastServerRef.current) return

    // Dirty vs last applied local snapshot — not vs the incoming server value.
    const dirty =
      formSnapshot(enabled, thresholds) !== appliedFormRef.current

    if (dirty) {
      setRemoteChanged(true)
      return
    }

    applyPolicy(serverPolicy)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from serverPolicy only
  }, [serverPolicy, initialized])

  const isDirty =
    formSnapshot(enabled, thresholds) !== appliedFormRef.current

  const emptyWhileEnabled = enabled && thresholds.length === 0
  const atMax = thresholds.length >= EXPIRY_MAX_THRESHOLDS
  const canEdit = !readOnly && enabled

  const addDay = (day: number) => {
    if (thresholds.includes(day)) {
      setFieldError(`${day} days is already in the list.`)
      setFlashDay(day)
      window.setTimeout(() => setFlashDay(null), 700)
      return
    }
    if (atMax) return
    setThresholds(sortDaysDesc([...thresholds, day]))
    setFieldError(null)
    setSaveNetworkError(false)
  }

  const removeDay = (day: number) => {
    setThresholds(thresholds.filter((value) => value !== day))
    setFieldError(null)
    setSaveNetworkError(false)
  }

  const handleAdd = () => {
    const trimmed = draft.trim()
    const value = Number(trimmed)
    if (
      !trimmed ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > 365
    ) {
      setFieldError("Enter a whole number between 1 and 365.")
      return
    }
    addDay(value)
    setDraft("")
  }

  const handleSave = async ({ silent = false }: { silent?: boolean } = {}) => {
    const current = formRef.current
    const dirty =
      formSnapshot(current.enabled, current.thresholds) !==
      appliedFormRef.current
    if (!dirty) return

    if (current.enabled && current.thresholds.length === 0) {
      setFieldError("Add at least one threshold, or turn alerts off.")
      throw new Error("Expiry policy requires at least one threshold")
    }
    if (readOnly || remoteChanged) {
      throw new Error("Expiry policy cannot be saved right now")
    }

    setSaveNetworkError(false)
    try {
      const policy = await saveMutation.mutateAsync({
        type,
        input: {
          enabled: current.enabled,
          thresholdsDays: current.thresholds,
        },
      })
      applyPolicy(policy)
      if (!silent) toast.success("Saved")
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldError(error.message)
        setSaveNetworkError(false)
      } else {
        setFieldError("Failed to save expiry policy")
        setSaveNetworkError(true)
      }
      throw error instanceof Error
        ? error
        : new Error("Failed to save expiry policy")
    }
  }

  useImperativeHandle(ref, () => ({
    save: () => handleSave({ silent: true }),
  }))

  const handleReset = () => {
    if (serverPolicy) applyPolicy(serverPolicy)
  }

  if (policiesQuery.isLoading) {
    return (
      <Card size="sm" className="bg-card">
        <CardHeader>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-72" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </CardContent>
      </Card>
    )
  }

  if (policiesQuery.error) {
    return (
      <Card size="sm" className="bg-card">
        <CardHeader>
          <CardTitle>{meta.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-2">
          <p className="text-destructive">{policiesQuery.error.message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void policiesQuery.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const alertSwitch = (
    <div className="flex shrink-0 items-center gap-2">
      <Label htmlFor={`${titleId}-alert`} className="text-xs">
        Alert me
      </Label>
      <Switch
        id={`${titleId}-alert`}
        checked={enabled}
        disabled={readOnly}
        onCheckedChange={(next) => {
          setEnabled(next)
          setFieldError(null)
          setSaveNetworkError(false)
        }}
        aria-label="Alert me"
      />
    </div>
  )

  return (
    <Card size="sm" className="bg-card" role="region" aria-labelledby={titleId}>
      <CardHeader className="border-b">
        {hideActions ? (
          <div className="flex items-center justify-end">{alertSwitch}</div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle id={titleId}>{meta.title}</CardTitle>
              <CardDescription>{meta.help}</CardDescription>
            </div>
            {alertSwitch}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-4">
        {remoteChanged ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              Settings changed elsewhere. Reload
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (serverPolicy) applyPolicy(serverPolicy)
              }}
            >
              Reload
            </Button>
          </div>
        ) : null}

        <div
          className={cn(
            "flex flex-wrap gap-1.5",
            !enabled && "opacity-50"
          )}
        >
          {thresholds.length === 0 ? (
            <p className="text-xs text-muted-foreground">No thresholds yet.</p>
          ) : (
            thresholds.map((day) => (
              <Badge
                key={day}
                variant="outline"
                className={cn(
                  "gap-1 pe-1",
                  flashDay === day && "animate-pulse ring-2 ring-destructive/40"
                )}
              >
                {day} days before
                {canEdit ? (
                  <button
                    type="button"
                    aria-label={`Remove ${day} days`}
                    className="rounded-full p-0.5 hover:bg-muted"
                    onClick={() => removeDay(day)}
                  >
                    <XIcon className="size-3" />
                  </button>
                ) : null}
              </Badge>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-40 flex-1">
              <Label htmlFor={`${titleId}-days`} className="sr-only">
                Days before
              </Label>
              <Input
                id={`${titleId}-days`}
                type="number"
                min={1}
                max={365}
                step={1}
                inputMode="numeric"
                placeholder="14"
                value={draft}
                disabled={!canEdit || atMax}
                onChange={(event) => {
                  setDraft(event.target.value)
                  setFieldError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    handleAdd()
                  }
                }}
                className="h-9 pe-24"
              />
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                days before
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canEdit || atMax}
              onClick={handleAdd}
            >
              Add
            </Button>
          </div>
          {fieldError ? (
            <p className="text-xs text-destructive">{fieldError}</p>
          ) : atMax ? (
            <p className="text-xs text-muted-foreground">Up to 20 thresholds.</p>
          ) : emptyWhileEnabled ? (
            <p className="text-xs text-muted-foreground">
              Add at least one threshold, or turn alerts off.
            </p>
          ) : null}
          {saveNetworkError ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={saveMutation.isPending}
              onClick={handleSave}
            >
              Retry
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {EXPIRY_SHORTCUTS.map((day) => {
            const present = thresholds.includes(day)
            return (
              <Button
                key={day}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={!canEdit || present || atMax}
                onClick={() => addDay(day)}
              >
                {day}
              </Button>
            )
          })}
        </div>
      </CardContent>

      {!readOnly && !hideActions ? (
        <CardFooter className="justify-end gap-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!isDirty || saveMutation.isPending}
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              !isDirty ||
              emptyWhileEnabled ||
              remoteChanged ||
              saveMutation.isPending
            }
            onClick={() => void handleSave()}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
})
