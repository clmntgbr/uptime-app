"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DrawerFormSkeleton } from "@/components/ui/drawer-form-skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { EmailRecipientsInput } from "@/components/notify-settings/email-recipients-input"
import { WorkflowSettings } from "@/components/workflow/workflow-settings"
import {
  EXPIRY_MAX_THRESHOLDS,
  EXPIRY_SHORTCUTS,
  EXPIRY_TYPES,
} from "@/lib/expiry/registry"
import { useCalls } from "@/lib/call/hooks"
import { useUser } from "@/lib/user/hooks"
import {
  useCreateWorkflow,
  useDeleteWorkflow,
  useUpdateWorkflow,
  useWorkflow,
} from "@/lib/workflow/hooks"
import {
  Workflow,
  WorkflowInput,
  WorkflowScheduleType,
} from "@/lib/workflow/types"
import { cn } from "@/lib/utils"
import { Loader2Icon, Trash2Icon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const FIELD_CLASS_NAME = "h-9 bg-background dark:bg-background"
const SELECT_TRIGGER_CLASS_NAME =
  "h-9 w-full bg-background dark:bg-background"

interface WorkflowDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` opens the drawer in create mode. */
  workflowId: string | null
}

export function WorkflowDrawer({
  open,
  onOpenChange,
  workflowId,
}: WorkflowDrawerProps) {
  const router = useRouter()
  const isEdit = workflowId !== null
  const workflowQuery = useWorkflow(open ? workflowId : null)
  const callsQuery = useCalls(open ? workflowId : null)
  const createMutation = useCreateWorkflow()
  const updateMutation = useUpdateWorkflow()
  const deleteMutation = useDeleteWorkflow()

  const mutation = isEdit ? updateMutation : createMutation
  const hasCalls = (callsQuery.data?.length ?? 0) > 0

  const handleSubmit = async (input: WorkflowInput) => {
    if (workflowId) {
      await updateMutation.mutateAsync({ id: workflowId, input })
    } else {
      await createMutation.mutateAsync(input)
    }
    onOpenChange(false)
  }

  const handleDelete = async () => {
    if (!workflowId || !workflowQuery.data) return
    if (!window.confirm(`Delete workflow "${workflowQuery.data.name}"?`)) return
    await deleteMutation.mutateAsync(workflowId)
    onOpenChange(false)
    router.push("/")
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      createMutation.reset()
      updateMutation.reset()
      deleteMutation.reset()
    }
    onOpenChange(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        showCloseButton
        className="flex h-full w-[80vw]! max-w-[80vw]! flex-col gap-0 p-0 sm:max-w-[80vw]!"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{isEdit ? "Edit workflow" : "New workflow"}</SheetTitle>
        </SheetHeader>

        {isEdit && workflowQuery.isLoading ? (
          <div className="px-6 py-8">
            <DrawerFormSkeleton fields={4} />
          </div>
        ) : isEdit && workflowQuery.error ? (
          <p className="px-6 py-8 text-destructive">
            {workflowQuery.error.message}
          </p>
        ) : open ? (
          <WorkflowForm
            key={workflowQuery.data?.id ?? "new"}
            workflowId={workflowId}
            workflow={isEdit ? workflowQuery.data : undefined}
            hasCalls={hasCalls}
            isPending={mutation.isPending}
            isDeleting={deleteMutation.isPending}
            error={
              mutation.error?.message ?? deleteMutation.error?.message ?? null
            }
            onSubmit={handleSubmit}
            onCancel={() => handleOpenChange(false)}
            onDelete={isEdit ? handleDelete : undefined}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

interface WorkflowFormProps {
  workflowId: string | null
  workflow?: Workflow
  hasCalls?: boolean
  isPending: boolean
  isDeleting?: boolean
  error: string | null
  onSubmit: (input: WorkflowInput) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}

const SCHEDULE_TYPES: { value: WorkflowScheduleType; label: string }[] = [
  { value: "interval", label: "Every N seconds" },
  { value: "once", label: "Once, at the next minute" },
  { value: "at", label: "Once, at a given date" },
]

/** `datetime-local` works in local time without seconds. */
function toDateTimeLocal(iso?: string): string {
  if (!iso) return ""
  const date = new Date(iso)
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function WorkflowForm({
  workflowId,
  workflow,
  hasCalls = false,
  isPending,
  isDeleting = false,
  error,
  onSubmit,
  onCancel,
  onDelete,
}: WorkflowFormProps) {
  const isCreate = !workflow
  const canEnable = hasCalls || Boolean(workflow?.enabled)
  const busy = isPending || isDeleting
  const [name, setName] = useState(workflow?.name ?? "")
  const [scheduleType, setScheduleType] = useState<WorkflowScheduleType>(
    workflow?.scheduleType ?? "interval"
  )
  const [intervalSeconds, setIntervalSeconds] = useState(
    String(workflow?.intervalSeconds ?? 300)
  )
  const [runAt, setRunAt] = useState(toDateTimeLocal(workflow?.runAt))
  const [enabled, setEnabled] = useState(workflow?.enabled ?? false)
  const { user } = useUser()
  const [tlsAlertsEnabled, setTlsAlertsEnabled] = useState(false)
  const [tlsThresholds, setTlsThresholds] = useState<number[]>([])
  const [tlsDraft, setTlsDraft] = useState("")
  const [tlsFieldError, setTlsFieldError] = useState<string | null>(null)
  const [notificationEmails, setNotificationEmails] = useState<string[]>([])
  const [notificationEmailsTouched, setNotificationEmailsTouched] =
    useState(false)

  useEffect(() => {
    if (!isCreate || notificationEmailsTouched || !user?.email) return
    setNotificationEmails([user.email.toLowerCase()])
  }, [isCreate, user?.email, notificationEmailsTouched])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isCreate && tlsAlertsEnabled && tlsThresholds.length === 0) {
      setTlsFieldError("Add at least one threshold, or turn alerts off.")
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        scheduleType,
        intervalSeconds:
          scheduleType === "interval" ? Number(intervalSeconds) : undefined,
        runAt:
          scheduleType === "at" ? new Date(runAt).toISOString() : undefined,
        enabled: isCreate ? false : enabled,
        ...(isCreate
          ? {
              expiryPolicies: [
                {
                  type: "tls_certificate" as const,
                  enabled: tlsAlertsEnabled,
                  thresholdsDays: tlsThresholds,
                },
              ],
              notificationEmails,
            }
          : {}),
      })
    } catch {
      // Displayed through the mutation error.
    }
  }

  const addTlsDay = (day: number) => {
    if (tlsThresholds.includes(day)) {
      setTlsFieldError(`${day} days is already in the list.`)
      return
    }
    if (tlsThresholds.length >= EXPIRY_MAX_THRESHOLDS) return
    setTlsThresholds([...tlsThresholds, day].sort((a, b) => b - a))
    setTlsFieldError(null)
  }

  const handleAddTlsDraft = () => {
    const trimmed = tlsDraft.trim()
    const value = Number(trimmed)
    if (
      !trimmed ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > 365
    ) {
      setTlsFieldError("Enter a whole number between 1 and 365.")
      return
    }
    addTlsDay(value)
    setTlsDraft("")
  }

  return (
    <form
      id="workflow-form"
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div className="space-y-1">
            <h2 className="font-semibold">General</h2>
            <p className="text-sm text-muted-foreground">
              Name, schedule, and whether this workflow is enabled.
            </p>
          </div>
          <div className="flex flex-col gap-6 md:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="workflow-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="workflow-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                required
                className={FIELD_CLASS_NAME}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workflow-schedule">Schedule</Label>
              <Select
                value={scheduleType}
                onValueChange={(value) =>
                  setScheduleType(value as WorkflowScheduleType)
                }
              >
                <SelectTrigger
                  id="workflow-schedule"
                  className={SELECT_TRIGGER_CLASS_NAME}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {scheduleType === "interval" ? (
              <div className="space-y-2">
                <Label htmlFor="workflow-interval">Interval (seconds)</Label>
                <Input
                  id="workflow-interval"
                  type="number"
                  min={60}
                  max={604800}
                  value={intervalSeconds}
                  onChange={(event) => setIntervalSeconds(event.target.value)}
                  required
                  className={FIELD_CLASS_NAME}
                />
              </div>
            ) : null}

            {scheduleType === "at" ? (
              <div className="space-y-2">
                <Label htmlFor="workflow-run-at">Run at (local time)</Label>
                <Input
                  id="workflow-run-at"
                  type="datetime-local"
                  value={runAt}
                  onChange={(event) => setRunAt(event.target.value)}
                  required
                  className={FIELD_CLASS_NAME}
                />
              </div>
            ) : null}

            {!isCreate ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Switch
                    id="workflow-enabled"
                    checked={enabled}
                    disabled={!canEnable}
                    onCheckedChange={setEnabled}
                  />
                  <Label htmlFor="workflow-enabled">Enabled</Label>
                </div>
                {!canEnable ? (
                  <p className="text-xs text-muted-foreground">
                    Add at least one call before enabling.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Workflows start paused. Add at least one call, then enable them
                from the workflow page.
              </p>
            )}
          </div>
        </div>

        {isCreate ? (
          <>
            <Separator className="my-10" />

            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              <div className="space-y-1">
                <h2 className="font-semibold">Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Who should receive alerts for this workflow.
                </p>
              </div>
              <div className="flex flex-col gap-6 md:col-span-2">
                <EmailRecipientsInput
                  label="Notification emails"
                  emails={notificationEmails}
                  onChange={(next) => {
                    setNotificationEmailsTouched(true)
                    setNotificationEmails(next)
                  }}
                />
              </div>
            </div>

            <Separator className="my-10" />

            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              <div className="space-y-1">
                <h2 className="font-semibold">
                  {EXPIRY_TYPES.tls_certificate.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {EXPIRY_TYPES.tls_certificate.help}
                </p>
              </div>
              <div className="flex flex-col gap-4 md:col-span-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="workflow-tls-alerts"
                    checked={tlsAlertsEnabled}
                    onCheckedChange={(next) => {
                      setTlsAlertsEnabled(next)
                      setTlsFieldError(null)
                    }}
                  />
                  <Label htmlFor="workflow-tls-alerts">Alert me</Label>
                </div>

                <div
                  className={cn(
                    "flex flex-wrap gap-1.5",
                    !tlsAlertsEnabled && "opacity-50"
                  )}
                >
                  {tlsThresholds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No thresholds yet.
                    </p>
                  ) : (
                    tlsThresholds.map((day) => (
                      <Badge key={day} variant="outline" className="gap-1 pe-1">
                        {day} days before
                        {tlsAlertsEnabled ? (
                          <button
                            type="button"
                            aria-label={`Remove ${day} days`}
                            className="rounded-full p-0.5 hover:bg-muted"
                            onClick={() =>
                              setTlsThresholds(
                                tlsThresholds.filter((value) => value !== day)
                              )
                            }
                          >
                            <XIcon className="size-3" />
                          </button>
                        ) : null}
                      </Badge>
                    ))
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    step={1}
                    inputMode="numeric"
                    placeholder="14"
                    value={tlsDraft}
                    disabled={!tlsAlertsEnabled}
                    onChange={(event) => {
                      setTlsDraft(event.target.value)
                      setTlsFieldError(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        handleAddTlsDraft()
                      }
                    }}
                    className={cn(FIELD_CLASS_NAME, "max-w-40")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!tlsAlertsEnabled}
                    onClick={handleAddTlsDraft}
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {EXPIRY_SHORTCUTS.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={
                        !tlsAlertsEnabled ||
                        tlsThresholds.includes(day) ||
                        tlsThresholds.length >= EXPIRY_MAX_THRESHOLDS
                      }
                      onClick={() => addTlsDay(day)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>

                {tlsFieldError ? (
                  <p className="text-xs text-destructive">{tlsFieldError}</p>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        {workflowId ? (
          <>
            <Separator className="my-10" />
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              <div className="space-y-1">
                <h2 className="font-semibold">Settings</h2>
                <p className="text-sm text-muted-foreground">
                  Incident policies, notifications, and certificate expiry.
                </p>
              </div>
              <div className="flex flex-col gap-4 md:col-span-2">
                <WorkflowSettings workflowId={workflowId} />
              </div>
            </div>
          </>
        ) : null}

        {error ? (
          <p className="mt-6 text-sm text-destructive">{error}</p>
        ) : null}
      </div>

      <div className="shrink-0 border-t bg-background px-6 py-4">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {onDelete ? (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={busy}
              >
                <Trash2Icon className="size-4" />
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
              {workflow ? "Update" : "Create"}
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
