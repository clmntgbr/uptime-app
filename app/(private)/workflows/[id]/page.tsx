"use client"

import { CallList } from "@/components/call/call-list"
import { Button } from "@/components/ui/button"
import { StaticVariables } from "@/components/variable/static-variables"
import { WorkflowDrawer } from "@/components/workflow/workflow-drawer"
import { ApiError } from "@/lib/api-error"
import {
  useDeleteWorkflow,
  useRunWorkflow,
  useWorkflow,
} from "@/lib/workflow/hooks"
import { Workflow } from "@/lib/workflow/types"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

function formatSchedule(workflow: Workflow) {
  switch (workflow.scheduleType) {
    case "interval":
      return `Every ${workflow.intervalSeconds}s`
    case "once":
      return "Once, at the next minute"
    case "at":
      return workflow.runAt
        ? `Once, at ${new Date(workflow.runAt).toLocaleString()}`
        : "Once, at a given date"
  }
}

function formatRunError(error: Error) {
  return error instanceof ApiError && error.code === "RUN_IN_PROGRESS"
    ? "A run is already in progress."
    : error.message
}

export default function WorkflowPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const workflowQuery = useWorkflow(id)
  const deleteMutation = useDeleteWorkflow()
  const runMutation = useRunWorkflow()

  const handleDelete = () => {
    const workflow = workflowQuery.data
    if (!workflow || !window.confirm(`Delete workflow "${workflow.name}"?`)) {
      return
    }
    deleteMutation.mutate(workflow.id, { onSuccess: () => router.push("/") })
  }

  if (workflowQuery.isLoading) {
    return <p className="text-muted-foreground">Loading…</p>
  }

  if (workflowQuery.error || !workflowQuery.data) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-destructive">
          {workflowQuery.error?.message ?? "Workflow not found"}
        </p>
        <Link href="/" className="hover:underline">
          ← Back to workflows
        </Link>
      </div>
    )
  }

  const workflow = workflowQuery.data

  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="text-muted-foreground hover:underline">
        ← Back to workflows
      </Link>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{workflow.name}</h1>
          <p className="text-muted-foreground">
            {formatSchedule(workflow)} ·{" "}
            {workflow.enabled ? "Enabled" : "Disabled"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={runMutation.isPending}
            onClick={() => runMutation.mutate(workflow.id)}
          >
            {runMutation.isPending ? "Starting…" : "Run"}
          </Button>
          <Button variant="outline" onClick={() => setDrawerOpen(true)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {runMutation.isSuccess && (
        <p className="text-muted-foreground">
          Run started ({runMutation.data.runId}).
        </p>
      )}
      {runMutation.error && (
        <p className="text-destructive">{formatRunError(runMutation.error)}</p>
      )}
      {deleteMutation.error && (
        <p className="text-destructive">{deleteMutation.error.message}</p>
      )}

      <CallList workflowId={workflow.id} />

      <StaticVariables workflowId={workflow.id} />

      <WorkflowDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        workflowId={workflow.id}
      />
    </div>
  )
}
