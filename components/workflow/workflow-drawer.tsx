"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  useCreateWorkflow,
  useUpdateWorkflow,
  useWorkflow,
} from "@/lib/workflow/hooks"
import { Workflow, WorkflowInput } from "@/lib/workflow/types"
import { useState } from "react"

const DEFAULT_CALLS = JSON.stringify(
  [
    {
      name: "homepage",
      method: "GET",
      url: "https://example.com",
      rules: [{ subject: "status", operator: "is", value: "200" }],
    },
  ],
  null,
  2
)

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
          <SheetDescription>
            {isEdit
              ? "Saving replaces the whole definition, calls included."
              : "Define the workflow and its calls."}
          </SheetDescription>
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
  // The detail endpoint does not return calls, so they must be re-entered on edit.
  const [calls, setCalls] = useState(workflow ? "" : DEFAULT_CALLS)
  const [statics, setStatics] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    let parsedCalls: WorkflowInput["calls"]
    let parsedStatics: WorkflowInput["statics"]
    try {
      parsedCalls = JSON.parse(calls)
      parsedStatics = statics.trim() ? JSON.parse(statics) : []
    } catch {
      setFormError("Calls and statics must be valid JSON.")
      return
    }

    if (!Array.isArray(parsedCalls) || parsedCalls.length === 0) {
      setFormError("At least one call is required.")
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        intervalSeconds: Number(intervalSeconds),
        enabled,
        statics: parsedStatics,
        calls: parsedCalls,
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="workflow-calls">Calls (JSON)</Label>
        <Textarea
          id="workflow-calls"
          value={calls}
          onChange={(event) => setCalls(event.target.value)}
          className="min-h-48 font-mono"
          placeholder={workflow ? DEFAULT_CALLS : undefined}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="workflow-statics">Statics (JSON, optional)</Label>
        <Textarea
          id="workflow-statics"
          value={statics}
          onChange={(event) => setStatics(event.target.value)}
          className="font-mono"
          placeholder='[{ "name": "base_url", "value": "https://example.com" }]'
        />
      </div>

      {(formError ?? error) && (
        <p className="text-destructive">{formError ?? error}</p>
      )}

      <SheetFooter className="px-0">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : workflow ? "Save" : "Create"}
        </Button>
      </SheetFooter>
    </form>
  )
}
