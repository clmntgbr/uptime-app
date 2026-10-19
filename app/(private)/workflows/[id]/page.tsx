"use client"

import { CallList } from "@/components/call/call-list"
import { DashboardStats } from "@/components/stats/dashboard-stats"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { StaticVariables } from "@/components/variable/static-variables"
import { WorkflowDrawer } from "@/components/workflow/workflow-drawer"
import { ApiError } from "@/lib/api-error"
import { useDashboardStats } from "@/lib/stats/hooks"
import {
  useRunWorkflow,
  useUpdateWorkflow,
  useWorkflow,
} from "@/lib/workflow/hooks"
import { workflowHealth, type WorkflowHealth } from "@/lib/workflow/status"
import type { Workflow } from "@/lib/workflow/types"
import { ArrowLeftIcon, SettingsIcon } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"

function formatRunError(error: Error) {
  return error instanceof ApiError && error.code === "RUN_IN_PROGRESS"
    ? "A run is already in progress."
    : error.message
}

function formatNextRun(nextRunAt: string | undefined) {
  if (!nextRunAt) return "No upcoming run"
  const date = new Date(nextRunAt)
  if (Number.isNaN(date.getTime())) return "No upcoming run"
  if (date.getTime() <= Date.now()) return "Next run due now"
  return `Next run ${date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

function healthBadgeVariant(
  health: WorkflowHealth
): "secondary" | "destructive" | "outline" {
  if (health === "failing") return "destructive"
  if (health === "paused") return "outline"
  return "secondary"
}

function workflowInputFrom(workflow: Workflow, enabled: boolean) {
  return {
    name: workflow.name,
    scheduleType: workflow.scheduleType,
    intervalSeconds: workflow.intervalSeconds,
    runAt: workflow.runAt,
    enabled,
  }
}

export default function WorkflowPage() {
  const { id } = useParams<{ id: string }>()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const workflowQuery = useWorkflow(id)
  const statsQuery = useDashboardStats(id)
  const runMutation = useRunWorkflow()
  const updateMutation = useUpdateWorkflow()

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
  const isRunning = workflow.isRunning
  const health = workflowHealth({
    enabled: workflow.enabled,
    openIncident: statsQuery.data?.openIncident,
    lastStatus: workflow.lastStatus,
  })

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
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
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
          <div className="ms-auto flex shrink-0 items-center gap-3">
            <span className="hidden text-xs text-muted-foreground md:inline">
              {formatNextRun(workflow.nextRunAt)}
            </span>
            <Switch
              id="workflow-enabled-header"
              size="sm"
              checked={workflow.enabled}
              disabled={updateMutation.isPending}
              onCheckedChange={(enabled) =>
                updateMutation.mutate({
                  id: workflow.id,
                  input: workflowInputFrom(workflow, enabled),
                })
              }
              aria-label={
                workflow.enabled ? "Disable workflow" : "Enable workflow"
              }
            />
            {isRunning ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                title="Stop is not available yet"
              >
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={runMutation.isPending}
                onClick={() => runMutation.mutate(workflow.id)}
              >
                {runMutation.isPending ? "Starting…" : "Run"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-4">
        {runMutation.error && (
          <p className="text-destructive">
            {formatRunError(runMutation.error)}
          </p>
        )}
        {updateMutation.error && (
          <p className="text-destructive">{updateMutation.error.message}</p>
        )}

        <DashboardStats
          workflowId={workflow.id}
          lastRunAt={workflow.lastRunAt}
          lastStatus={workflow.lastStatus}
          isRunning={workflow.isRunning}
        />
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
