"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  useCreateWorkflow,
  useUpdateWorkflow,
  useWorkflow,
} from "@/lib/workflow/hooks"
import { Workflow, WorkflowInput } from "@/lib/workflow/types"
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
  const isEdit = workflowId !== null
  const workflowQuery = useWorkflow(open ? workflowId : null)
  const createMutation = useCreateWorkflow()
  const updateMutation = useUpdateWorkflow()

  const mutation = isEdit ? updateMutation : createMutation

  const handleSubmit = async (input: WorkflowInput) => {
    if (workflowId) {
      await updateMutation.mutateAsync({ id: workflowId, input })
    } else {
      await createMutation.mutateAsync(input)
    }
    onOpenChange(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      createMutation.reset()
      updateMutation.reset()
    }
    onOpenChange(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit workflow" : "New workflow"}</SheetTitle>
        </SheetHeader>

        {isEdit && workflowQuery.isLoading ? (
          <p className="px-4 text-muted-foreground">Loading…</p>
        ) : isEdit && workflowQuery.error ? (
          <p className="px-4 text-destructive">{workflowQuery.error.message}</p>
        ) : open ? (
          <WorkflowForm
            key={workflowQuery.data?.id ?? "new"}
            workflow={isEdit ? workflowQuery.data : undefined}
            isPending={mutation.isPending}
            error={mutation.error?.message ?? null}
            onSubmit={handleSubmit}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

interface WorkflowFormProps {
  workflow?: Workflow
  isPending: boolean
  error: string | null
  onSubmit: (input: WorkflowInput) => Promise<void>
}

function WorkflowForm({
  workflow,
  isPending,
  error,
  onSubmit,
}: WorkflowFormProps) {
  const [name, setName] = useState(workflow?.name ?? "")
  const [intervalSeconds, setIntervalSeconds] = useState(
    String(workflow?.intervalSeconds ?? 300)
  )
  const [enabled, setEnabled] = useState(workflow?.enabled ?? true)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await onSubmit({
        name: name.trim(),
        intervalSeconds: Number(intervalSeconds),
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

      <div className="flex items-center gap-2">
        <Switch
          id="workflow-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
        <Label htmlFor="workflow-enabled">Enabled</Label>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      <SheetFooter className="px-0">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : workflow ? "Save" : "Create"}
        </Button>
      </SheetFooter>
    </form>
  )
}
