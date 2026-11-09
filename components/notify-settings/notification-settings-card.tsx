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
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { EmailRecipientsInput } from "@/components/notify-settings/email-recipients-input"
import { ApiError } from "@/lib/api-error"
import {
  useNotificationSettings,
  useUpsertNotificationSettings,
} from "@/lib/notify-settings/hooks"
import type { NotificationSettings } from "@/lib/notify-settings/types"
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

function formSnapshot(s: {
  emails: string[]
  incidentsEnabled: boolean
  tlsEnabled: boolean
}) {
  return JSON.stringify({
    emails: [...s.emails].sort(),
    incidentsEnabled: s.incidentsEnabled,
    tlsEnabled: s.tlsEnabled,
  })
}

function serverSnapshot(s: NotificationSettings) {
  return JSON.stringify({
    emails: [...(s.emails ?? [])].sort(),
    incidentsEnabled: s.incidentsEnabled,
    tlsEnabled: s.tlsEnabled,
    updatedAt: s.updatedAt ?? null,
  })
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
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [remoteChanged, setRemoteChanged] = useState(false)
  const lastServerRef = useRef("")
  const appliedFormRef = useRef("")
  const formRef = useRef({ emails, incidentsEnabled, tlsEnabled })
  formRef.current = { emails, incidentsEnabled, tlsEnabled }

  const applySettings = (s: NotificationSettings) => {
    const nextEmails = [...(s.emails ?? [])]
    setEmails(nextEmails)
    setIncidentsEnabled(s.incidentsEnabled)
    setTlsEnabled(s.tlsEnabled)
    setRemoteChanged(false)
    setFieldError(null)
    lastServerRef.current = serverSnapshot(s)
    appliedFormRef.current = formSnapshot({
      emails: nextEmails,
      incidentsEnabled: s.incidentsEnabled,
      tlsEnabled: s.tlsEnabled,
    })
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
    const dirty =
      formSnapshot({ emails, incidentsEnabled, tlsEnabled }) !==
      appliedFormRef.current
    if (dirty) {
      setRemoteChanged(true)
      lastServerRef.current = serialized
      return
    }
    applySettings(query.data)
  }, [query.data, initialized, emails, incidentsEnabled, tlsEnabled])

  const dirty =
    initialized &&
    formSnapshot({ emails, incidentsEnabled, tlsEnabled }) !==
      appliedFormRef.current

  const handleSave = async ({ silent = false }: { silent?: boolean } = {}) => {
    const current = formRef.current
    const dirty =
      initialized &&
      formSnapshot(current) !== appliedFormRef.current
    if (!dirty) return

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
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
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
            Who receives mail for incidents and TLS certificate alerts.
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
          description="Opened, reminder, and resolved"
          checked={incidentsEnabled}
          disabled={readOnly}
          onCheckedChange={setIncidentsEnabled}
        />
        <FamilySwitch
          id={`${titleId}-tls`}
          label="TLS certificates"
          description="Threshold crossed and expired"
          checked={tlsEnabled}
          disabled={readOnly}
          onCheckedChange={setTlsEnabled}
        />

        <p className="text-sm text-muted-foreground">
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => {
              document
                .getElementById("workflow-incident-policies")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
          >
            Want to be told sooner? Lower &quot;Open after&quot; in Incidents.
          </button>
        </p>

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
