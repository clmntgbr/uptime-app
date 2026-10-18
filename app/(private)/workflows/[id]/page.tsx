"use client"

import { CallList } from "@/components/call/call-list"
import { DashboardStats } from "@/components/stats/dashboard-stats"
import { Button } from "@/components/ui/button"
import { StaticVariables } from "@/components/variable/static-variables"
import { WorkflowDrawer } from "@/components/workflow/workflow-drawer"
import { ApiError } from "@/lib/api-error"
import { useRunWorkflow, useWorkflow } from "@/lib/workflow/hooks"
import { Workflow } from "@/lib/workflow/types"
import { ArrowLeftIcon, SettingsIcon } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
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
  const [drawerOpen, setDrawerOpen] = useState(false)

  const workflowQuery = useWorkflow(id)
  const runMutation = useRunWorkflow()

  if (workflowQuery.isLoading) {
    return <p className="text-muted-foreground">Loading…</p>
  }

  if (workflowQuery.error || !workflowQuery.data) {
    return (
      <div className="flex flex-col items-start gap-2 pt-4">
        <p className="text-destructive">
          {workflowQuery.error?.message ?? "Workflow not found"}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to dashboard
        </Link>
      </div>
    )
  }

  const workflow = workflowQuery.data

  return (
    <div className="flex flex-col">
      <div className="sticky top-16 z-10 -mx-4 border-b bg-background px-4">
        <div className="flex h-12 items-center gap-2">
          <Link
            href="/"
            aria-label="Back to dashboard"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <div className="flex min-w-0 items-center gap-1">
            <h1 className="truncate text-sm font-medium">{workflow.name}</h1>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label="Edit workflow"
              onClick={() => setDrawerOpen(true)}
            >
              <SettingsIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground">
          {formatSchedule(workflow)} ·{" "}
          {workflow.enabled ? "Enabled" : "Disabled"}
        </p>
        <Button
          disabled={runMutation.isPending}
          onClick={() => runMutation.mutate(workflow.id)}
        >
          {runMutation.isPending ? "Starting…" : "Run"}
        </Button>
      </div>

      {runMutation.isSuccess && (
        <p className="text-muted-foreground">
          Run started ({runMutation.data.runId}).
        </p>
      )}
      {runMutation.error && (
        <p className="text-destructive">{formatRunError(runMutation.error)}</p>
      )}

      <DashboardStats workflowId={workflow.id} />

      <CallList workflowId={workflow.id} />

      <StaticVariables workflowId={workflow.id} />

      <WorkflowDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        workflowId={workflow.id}
      />
      </div>
    </div>
  )
}
