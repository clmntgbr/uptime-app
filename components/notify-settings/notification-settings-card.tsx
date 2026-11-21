"use client"

import { EmailRecipientsInput } from "@/components/notify-settings/email-recipients-input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  useNotificationSettings,
  useUpsertNotificationSettings,
} from "@/lib/notify-settings/hooks"
import {
  DEFAULT_RUN_STATUSES,
  RUN_MODE_OPTIONS,
  RUN_STATUS_OPTIONS,
  type NotificationSettings,
  type RunNotifyMode,
  type RunNotifyStatus,
  type UpsertNotificationSettingsInput,
} from "@/lib/notify-settings/types"
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

export type NotificationSettingsCardHandle = {
  save: () => Promise<void>
}

type FormState = UpsertNotificationSettingsInput

function normalizeRunStatuses(raw: string[] | undefined): RunNotifyStatus[] {
  const allowed = new Set(RUN_STATUS_OPTIONS.map((o) => o.value))
  const next = (raw ?? [])
    .map((s) => s.toLowerCase().trim())
    .filter((s): s is RunNotifyStatus => allowed.has(s as RunNotifyStatus))
  return next.length > 0 ? next : [...DEFAULT_RUN_STATUSES]
}

function normalizeRunMode(raw: string | undefined): RunNotifyMode {
  return raw === "every" ? "every" : "transition"
}

function formSnapshot(s: FormState) {
  return JSON.stringify({
    emails: [...s.emails].sort(),
    incidentsEnabled: s.incidentsEnabled,
    tlsEnabled: s.tlsEnabled,
    runsEnabled: s.runsEnabled,
    runStatuses: [...s.runStatuses].sort(),
    runMode: s.runMode,
  })
}

function serverSnapshot(s: NotificationSettings) {
  return JSON.stringify({
    emails: [...(s.emails ?? [])].sort(),
    incidentsEnabled: s.incidentsEnabled,
    tlsEnabled: s.tlsEnabled,
    runsEnabled: s.runsEnabled,
    runStatuses: normalizeRunStatuses(s.runStatuses).slice().sort(),
    runMode: normalizeRunMode(s.runMode),
    updatedAt: s.updatedAt ?? null,
  })
}

function toFormState(s: NotificationSettings): FormState {
  return {
    emails: [...(s.emails ?? [])],
    incidentsEnabled: s.incidentsEnabled,
    tlsEnabled: s.tlsEnabled,
    runsEnabled: Boolean(s.runsEnabled),
    runStatuses: normalizeRunStatuses(s.runStatuses),
    runMode: normalizeRunMode(s.runMode),
  }
}

export const NotificationSettingsCard = forwardRef<
  NotificationSettingsCardHandle,
  {
    workflowId: string
    readOnly?: boolean
    /** Hide Reset/Save — parent form saves via ref. */
    hideActions?: boolean
  }
>(function NotificationSettingsCard(
  { workflowId, readOnly = false, hideActions = false },
  ref
) {
  const titleId = useId()
  const query = useNotificationSettings(workflowId)
  const saveMutation = useUpsertNotificationSettings(workflowId)

  const [emails, setEmails] = useState<string[]>([])
  const [incidentsEnabled, setIncidentsEnabled] = useState(true)
  const [tlsEnabled, setTlsEnabled] = useState(true)
  const [runsEnabled, setRunsEnabled] = useState(false)
  const [runStatuses, setRunStatuses] = useState<RunNotifyStatus[]>([
    ...DEFAULT_RUN_STATUSES,
  ])
  const [runMode, setRunMode] = useState<RunNotifyMode>("transition")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [remoteChanged, setRemoteChanged] = useState(false)
  const lastServerRef = useRef("")
  const appliedFormRef = useRef("")
  const formRef = useRef<FormState>({
    emails,
    incidentsEnabled,
    tlsEnabled,
    runsEnabled,
    runStatuses,
    runMode,
  })
  formRef.current = {
    emails,
    incidentsEnabled,
    tlsEnabled,
    runsEnabled,
    runStatuses,
    runMode,
  }

  const applySettings = (s: NotificationSettings) => {
    const next = toFormState(s)
    setEmails(next.emails)
    setIncidentsEnabled(next.incidentsEnabled)
    setTlsEnabled(next.tlsEnabled)
    setRunsEnabled(next.runsEnabled)
    setRunStatuses(next.runStatuses as RunNotifyStatus[])
    setRunMode(next.runMode)
    setRemoteChanged(false)
    setFieldError(null)
    lastServerRef.current = serverSnapshot(s)
    appliedFormRef.current = formSnapshot(next)
  }

  useEffect(() => {
    if (!query.data) return
    const serialized = serverSnapshot(query.data)
    if (!initialized) {
      applySettings(query.data)
      setInitialized(true)
      return
    }
    if (serialized === lastServerRef.current) return
    const dirty = formSnapshot(formRef.current) !== appliedFormRef.current
    if (dirty) {
      setRemoteChanged(true)
      lastServerRef.current = serialized
      return
    }
    applySettings(query.data)
  }, [
    query.data,
    initialized,
    emails,
    incidentsEnabled,
    tlsEnabled,
    runsEnabled,
    runStatuses,
    runMode,
  ])

  const dirty =
    initialized && formSnapshot(formRef.current) !== appliedFormRef.current

  const toggleRunStatus = (status: RunNotifyStatus, checked: boolean) => {
    setRunStatuses((prev) => {
      if (checked) {
        return prev.includes(status) ? prev : [...prev, status]
      }
      const next = prev.filter((s) => s !== status)
      return next.length > 0 ? next : prev
    })
  }

  const handleSave = async ({ silent = false }: { silent?: boolean } = {}) => {
    const current = formRef.current
    const isDirty =
      initialized && formSnapshot(current) !== appliedFormRef.current
    if (!isDirty) return

    setFieldError(null)
    try {
      const data = await saveMutation.mutateAsync(current)
      applySettings(data)
      if (!silent) toast.success("Saved")
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to save notification settings"
      setFieldError(message)
      toast.error(message)
      throw err instanceof Error ? err : new Error(message)
    }
  }

  useImperativeHandle(ref, () => ({
    save: () => handleSave({ silent: true }),
  }))

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (query.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>Failed to load settings.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      {!hideActions ? (
        <CardHeader>
          <CardTitle id={titleId}>Email</CardTitle>
          <CardDescription>
            Who receives mail for incidents, TLS certificates, and runs.
          </CardDescription>
        </CardHeader>
      ) : null}
      <CardContent className="flex flex-col gap-5">
        <EmailRecipientsInput
          emails={emails}
          onChange={setEmails}
          readOnly={readOnly}
        />

        <FamilySwitch
          id={`${titleId}-incidents`}
          label="Incidents"
          description="Opened, reopened, reminder, and resolved"
          checked={incidentsEnabled}
          disabled={readOnly}
          onCheckedChange={setIncidentsEnabled}
        />
        <FamilySwitch
          id={`${titleId}-tls`}
          label="TLS certificates"
          description="Threshold crossed, expired, and renewed"
          checked={tlsEnabled}
          disabled={readOnly}
          onCheckedChange={setTlsEnabled}
        />

        <div className="space-y-3">
          <FamilySwitch
            id={`${titleId}-runs`}
            label="Runs"
            description="Failed, errored, and successful workflow runs"
            checked={runsEnabled}
            disabled={readOnly}
            onCheckedChange={setRunsEnabled}
          />
          {runsEnabled ? (
            <div className="ml-0 space-y-4 rounded-md border border-border/60 p-3 sm:ml-1">
              <div className="space-y-2">
                <p className="text-sm font-medium">Statuses</p>
                <div className="space-y-2">
                  {RUN_STATUS_OPTIONS.map((opt) => {
                    const checked = runStatuses.includes(opt.value)
                    const checkboxId = `${titleId}-run-${opt.value}`
                    return (
                      <div key={opt.value} className="flex items-start gap-3">
                        <Checkbox
                          id={checkboxId}
                          checked={checked}
                          disabled={
                            readOnly || (checked && runStatuses.length === 1)
                          }
                          onCheckedChange={(v) =>
                            toggleRunStatus(opt.value, v === true)
                          }
                        />
                        <div className="space-y-0.5">
                          <Label htmlFor={checkboxId}>{opt.label}</Label>
                          <p className="text-sm text-muted-foreground">
                            {opt.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${titleId}-run-mode`}>When to send</Label>
                <Select
                  value={runMode}
                  disabled={readOnly}
                  onValueChange={(v) =>
                    setRunMode(v === "every" ? "every" : "transition")
                  }
                >
                  <SelectTrigger id={`${titleId}-run-mode`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RUN_MODE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label} — {opt.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </div>

        {fieldError && (
          <p className="text-sm text-destructive" role="alert">
            {fieldError}
          </p>
        )}
        {remoteChanged && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            Settings changed elsewhere.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                if (query.data) applySettings(query.data)
              }}
            >
              Reload
            </button>
          </p>
        )}
      </CardContent>
      {!readOnly && !hideActions ? (
        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => {
              if (query.data) applySettings(query.data)
            }}
          >
            Reset
          </Button>
          <Button
            type="button"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => void handleSave()}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
})

function FamilySwitch({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}
