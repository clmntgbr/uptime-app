"use client"

import { RunDrawer } from "@/components/run/run-drawer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatLatencyMs, formatRunStatusLabel } from "@/lib/stats/format"
import { useRuns } from "@/lib/run/hooks"
import type { RunListItem } from "@/lib/run/types"
import { useState } from "react"

const PAGE_LIMIT = 10

function statusBadgeVariant(
  status: string
): "outline" | "destructive" | "secondary" | "default" {
  if (status === "failed" || status === "error") return "destructive"
  if (status === "success") return "secondary"
  if (status === "running") return "default"
  return "outline"
}

function formatStartedAt(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function countsSummary(run: RunListItem) {
  const { success, failed, error, skipped, total } = run.counts
  if (total === 0) return "No calls"
  const parts = [`${success} ok`]
  if (failed + error > 0) parts.push(`${failed + error} failed`)
  if (skipped > 0) parts.push(`${skipped} skipped`)
  return parts.join(" · ")
}

export function RunList({ workflowId }: { workflowId: string }) {
  const [page, setPage] = useState(1)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const runsQuery = useRuns(workflowId, {
    page,
    limit: PAGE_LIMIT,
    sortBy: "startedAt",
    orderBy: "desc",
  })

  const openRun = (runId: string) => {
    setSelectedRunId(runId)
    setDrawerOpen(true)
  }

  const data = runsQuery.data
  const totalPages = Math.max(data?.totalPages ?? 1, 1)

  return (
    <section className="flex flex-col gap-3">
      {runsQuery.isLoading ? (
        <p className="text-muted-foreground">Loading runs…</p>
      ) : runsQuery.error ? (
        <p className="text-destructive">{runsQuery.error.message}</p>
      ) : !data?.members.length ? (
        <p className="text-muted-foreground">No runs yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {data.members.map((run) => (
            <li key={run.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-muted/50"
                onClick={() => openRun(run.id)}
              >
                <Badge
                  variant={statusBadgeVariant(run.status)}
                  className="shrink-0"
                >
                  {formatRunStatusLabel(run.status)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium tabular-nums">
                      {formatStartedAt(run.startedAt)}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {run.trigger}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {countsSummary(run)}
                    {run.reason ? ` · ${run.reason}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {run.status === "running" || !run.finishedAt
                    ? "—"
                    : formatLatencyMs(run.durationMs)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} / {totalPages} · {data.total} runs
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <RunDrawer
        workflowId={workflowId}
        runId={selectedRunId}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          // Keep runId during close animation, then drop so detail stays inactive.
          if (!open) {
            window.setTimeout(() => setSelectedRunId(null), 300)
          }
        }}
      />
    </section>
  )
}
