"use client"

import { RunList } from "@/components/run/run-list"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkflowCharts } from "@/components/workflow/workflow-charts"
import { WorkflowDrawer } from "@/components/workflow/workflow-drawer"
import { WorkflowStats } from "@/components/workflow/workflow-stats"
import { ApiError } from "@/lib/api-error"
import {
  useRunWorkflow,
  useStopWorkflow,
  useUpdateWorkflow,
  useWorkflow,
} from "@/lib/workflow/hooks"
import type { Workflow } from "@/lib/workflow/types"
import { ArrowLeftIcon, SettingsIcon } from "lucide-react"
import Link from "next/link"
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { useCallback, useState } from "react"

const WORKFLOW_TABS = ["overview", "runs"] as const
type WorkflowTab = (typeof WORKFLOW_TABS)[number]

function parseWorkflowTab(value: string | null): WorkflowTab {
  if (value === "runs") return value
  return "overview"
}

function formatRunError(error: Error) {
  if (!(error instanceof ApiError)) return error.message
  if (error.code === "RUN_IN_PROGRESS") return "A run is already in progress."
  if (error.code === "NO_RUN_IN_PROGRESS") return "No run is in progress."
  return error.message
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const tab = parseWorkflowTab(searchParams.get("tabs"))

  const setTab = useCallback(
    (next: string) => {
      const value = parseWorkflowTab(next)
      const params = new URLSearchParams(searchParams.toString())
      params.set("tabs", value)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const workflowQuery = useWorkflow(id)
  const runMutation = useRunWorkflow()
  const stopMutation = useStopWorkflow()
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

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-0">
      <div className="sticky top-16 z-10 -mx-4 border-b bg-card px-4">
        <div className="grid h-12 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex min-w-0 items-center gap-1.5 justify-self-start">
            <Link
              href="/"
              aria-label="Back to dashboard"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" />
            </Link>
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

          <TabsList className="justify-self-center">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
          </TabsList>

          <div className="flex min-w-0 items-center justify-end gap-3 justify-self-end">
            <span className="hidden truncate text-xs text-muted-foreground md:inline">
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
                disabled={stopMutation.isPending}
                onClick={() => stopMutation.mutate(workflow.id)}
              >
                {stopMutation.isPending ? "Stopping…" : "Stop"}
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

      <TabsContent
        value="overview"
        className="flex flex-col gap-4 pt-4 text-sm container max-w-8xl mx-auto"
      >
        {runMutation.error && (
          <p className="text-destructive">
            {formatRunError(runMutation.error)}
          </p>
        )}
        {stopMutation.error && (
          <p className="text-destructive">
            {formatRunError(stopMutation.error)}
          </p>
        )}
        {updateMutation.error && (
          <p className="text-destructive">{updateMutation.error.message}</p>
        )}

        <WorkflowStats
          workflowId={workflow.id}
          lastRunAt={workflow.lastRunAt}
          lastStatus={workflow.lastStatus}
          isRunning={workflow.isRunning}
        />
        <WorkflowCharts workflowId={workflow.id} />
      </TabsContent>

      <TabsContent value="runs" className="pt-4 text-sm">
        <RunList key={workflow.id} workflowId={workflow.id} />
      </TabsContent>

      <WorkflowDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        workflowId={workflow.id}
      />
    </Tabs>
  )
}
