"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DrawerFormActions } from "@/components/ui/drawer-form-actions"
import { DrawerFormSkeleton } from "@/components/ui/drawer-form-skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { WorkflowSettings } from "@/components/workflow/workflow-settings"
import {
  EXPIRY_MAX_THRESHOLDS,
  EXPIRY_SHORTCUTS,
  EXPIRY_TYPES,
} from "@/lib/expiry/registry"
import { useCalls } from "@/lib/call/hooks"
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
import { XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

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
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit workflow" : "New workflow"}</SheetTitle>
        </SheetHeader>

        {isEdit && workflowQuery.isLoading ? (
          <DrawerFormSkeleton fields={3} />
        ) : isEdit && workflowQuery.error ? (
          <p className="px-4 text-destructive">{workflowQuery.error.message}</p>
        ) : open ? (
          <div className="flex flex-col gap-6 pb-6">
            <WorkflowForm
              key={workflowQuery.data?.id ?? "new"}
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
            {workflowId ? (
              <div className="border-t px-4 pt-4">
                <WorkflowSettings workflowId={workflowId} />
              </div>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

interface WorkflowFormProps {
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
  const [name, setName] = useState(workflow?.name ?? "")
  const [scheduleType, setScheduleType] = useState<WorkflowScheduleType>(
    workflow?.scheduleType ?? "interval"
  )
  const [intervalSeconds, setIntervalSeconds] = useState(
    String(workflow?.intervalSeconds ?? 300)
  )
  const [runAt, setRunAt] = useState(toDateTimeLocal(workflow?.runAt))
  const [enabled, setEnabled] = useState(workflow?.enabled ?? false)
  const [tlsAlertsEnabled, setTlsAlertsEnabled] = useState(false)
  const [tlsThresholds, setTlsThresholds] = useState<number[]>([])
  const [tlsDraft, setTlsDraft] = useState("")
  const [tlsFieldError, setTlsFieldError] = useState<string | null>(null)

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
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="workflow-name">Name</Label>
        <Input
          id="workflow-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={200}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="workflow-schedule">Schedule</Label>
        <select
          id="workflow-schedule"
          value={scheduleType}
          onChange={(event) =>
            setScheduleType(event.target.value as WorkflowScheduleType)
          }
          className="h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {SCHEDULE_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {scheduleType === "interval" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="workflow-interval">Interval (seconds)</Label>
          <Input
            id="workflow-interval"
            type="number"
            min={60}
            max={604800}
            value={intervalSeconds}
            onChange={(event) => setIntervalSeconds(event.target.value)}
            required
          />
        </div>
      )}

      {scheduleType === "at" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="workflow-run-at">Run at (local time)</Label>
          <Input
            id="workflow-run-at"
            type="datetime-local"
            value={runAt}
            onChange={(event) => setRunAt(event.target.value)}
            required
          />
        </div>
      )}

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
          Workflows start paused. Add at least one call, then enable them from
          the workflow page.
        </p>
      )}

      {isCreate ? (
        <div className="flex flex-col gap-3 rounded-md border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {EXPIRY_TYPES.tls_certificate.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {EXPIRY_TYPES.tls_certificate.help}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Label htmlFor="workflow-tls-alerts" className="text-xs">
                Alert me
              </Label>
              <Switch
                id="workflow-tls-alerts"
                checked={tlsAlertsEnabled}
                onCheckedChange={(next) => {
                  setTlsAlertsEnabled(next)
                  setTlsFieldError(null)
                }}
              />
            </div>
          </div>

          <div
            className={cn(
              "flex flex-wrap gap-1.5",
              !tlsAlertsEnabled && "opacity-50"
            )}
          >
            {tlsThresholds.length === 0 ? (
              <p className="text-xs text-muted-foreground">No thresholds yet.</p>
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
              className="h-9 max-w-40"
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
      ) : null}

      {error && <p className="text-destructive">{error}</p>}

      <DrawerFormActions
        isEdit={Boolean(workflow)}
        isPending={isPending}
        isDeleting={isDeleting}
        submitLabel={workflow ? "Save" : "Create"}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </form>
  )
}
