"use client"

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
  const createMutation = useCreateWorkflow()
  const updateMutation = useUpdateWorkflow()
  const deleteMutation = useDeleteWorkflow()

  const mutation = isEdit ? updateMutation : createMutation

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
  isPending,
  isDeleting = false,
  error,
  onSubmit,
  onCancel,
  onDelete,
}: WorkflowFormProps) {
  const [name, setName] = useState(workflow?.name ?? "")
  const [scheduleType, setScheduleType] = useState<WorkflowScheduleType>(
    workflow?.scheduleType ?? "interval"
  )
  const [intervalSeconds, setIntervalSeconds] = useState(
    String(workflow?.intervalSeconds ?? 300)
  )
  const [runAt, setRunAt] = useState(toDateTimeLocal(workflow?.runAt))
  const [enabled, setEnabled] = useState(workflow?.enabled ?? true)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await onSubmit({
        name: name.trim(),
        scheduleType,
        intervalSeconds:
          scheduleType === "interval" ? Number(intervalSeconds) : undefined,
        runAt:
          scheduleType === "at" ? new Date(runAt).toISOString() : undefined,
        enabled,
      })
    } catch {
      // Displayed through the mutation error.
    }
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

      <div className="flex items-center gap-2">
        <Switch
          id="workflow-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
        <Label htmlFor="workflow-enabled">Enabled</Label>
      </div>

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
