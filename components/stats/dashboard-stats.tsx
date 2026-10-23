"use client"

import { CircleHelpIcon } from "lucide-react"
import type { ReactNode } from "react"

import { StatsAreaChart } from "@/components/stats/stats-area-chart"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  formatLatencyMs,
  formatRate,
  formatRunStatusLabel,
} from "@/lib/stats/format"
import { useDashboardStats, useRelativeTime } from "@/lib/stats/hooks"

function LatencyP95Label() {
  return (
    <span className="inline-flex items-center gap-1">
      Latency p95
      <HoverCard>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="inline-flex size-3.5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            aria-label="What is latency p95?"
          >
            <CircleHelpIcon className="size-3.5" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent side="top" align="start" className="w-64 space-y-1.5">
          <p className="font-medium text-foreground">Latency p95</p>
          <p className="text-muted-foreground">
            The 95th percentile of finished run durations over the last 24
            hours. 95% of runs completed at or below this time; the slowest 5%
            took longer.
          </p>
        </HoverCardContent>
      </HoverCard>
    </span>
  )
}

function StatCard({
  description,
  value,
  badge = null,
  badgeVariant = "outline",
  footerTitle = null,
  footerHint = null,
}: {
  description: ReactNode
  value: ReactNode
  badge?: string | null
  badgeVariant?: "outline" | "destructive" | "secondary" | "default"
  footerTitle?: string | null
  footerHint?: string | null
}) {
  const showFooter = footerTitle != null || footerHint != null

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {badge != null && (
          <CardAction>
            <Badge variant={badgeVariant}>{badge}</Badge>
          </CardAction>
        )}
      </CardHeader>
      {showFooter && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {footerTitle != null && (
            <div className="line-clamp-1 font-medium">{footerTitle}</div>
          )}
          {footerHint != null && (
            <div className="text-muted-foreground">{footerHint}</div>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

function lastRunBadgeVariant(
  status: string | undefined
): "outline" | "destructive" | "secondary" | "default" {
  if (status === "failed" || status === "error") return "destructive"
  if (status === "success") return "secondary"
  return "outline"
}

function countWithFailures(
  total: number,
  failed: number,
  error: number
): ReactNode {
  const parts: string[] = []
  if (failed > 0) parts.push(`${failed} failed`)
  if (error > 0) parts.push(`${error} error${error === 1 ? "" : "s"}`)
  if (!parts.length) return total
  return (
    <>
      {total}{" "}
      <span className="text-sm font-normal text-muted-foreground">
        with {parts.join(", ")}
      </span>
    </>
  )
}

function LastRunStatCard({
  isRunning,
  lastRunAt,
  lastStatus,
}: {
  isRunning: boolean
  lastRunAt?: string
  lastStatus?: string
}) {
  const lastRunRelative = useRelativeTime(isRunning ? null : lastRunAt)
  const resolvedStatus = isRunning ? "running" : lastStatus

  return (
    <StatCard
      description="Last run"
      value={
        isRunning
          ? formatRunStatusLabel("running")
          : lastRunAt
            ? lastRunRelative
            : "—"
      }
      badge={
        isRunning
          ? null
          : resolvedStatus
            ? formatRunStatusLabel(resolvedStatus)
            : null
      }
      badgeVariant={lastRunBadgeVariant(resolvedStatus)}
    />
  )
}

export function DashboardStats({
  workflowId,
  lastRunAt,
  lastStatus,
  isRunning = false,
}: {
  workflowId?: string
  lastRunAt?: string
  lastStatus?: string
  isRunning?: boolean
} = {}) {
  const statsQuery = useDashboardStats(workflowId)

  if (statsQuery.isLoading) {
    return <p className="text-muted-foreground">Loading stats…</p>
  }

  if (statsQuery.error || !statsQuery.data) {
    return (
      <p className="text-destructive">
        {statsQuery.error?.message ?? "Failed to load stats"}
      </p>
    )
  }

  const { runs, calls, successRate, latencyP95Ms } = statsQuery.data
  const runsValue = countWithFailures(runs.total, runs.failed, runs.error)
  const callsValue = countWithFailures(calls.total, calls.failed, calls.error)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <StatCard
          description="Availability"
          value={runs.total > 0 ? formatRate(successRate) : "—"}
          badge="24h"
        />
        <StatCard description="Runs" value={runsValue} badge="24h" />
        <StatCard
          description={<LatencyP95Label />}
          value={formatLatencyMs(latencyP95Ms)}
          badge="24h"
        />
        {workflowId ? (
          <LastRunStatCard
            isRunning={isRunning}
            lastRunAt={lastRunAt}
            lastStatus={lastStatus}
          />
        ) : (
          <StatCard description="Calls" value={callsValue} badge="24h" />
        )}
      </div>

      <StatsAreaChart
        runsDaily={runs.daily ?? []}
        callsDaily={statsQuery.data.calls.daily ?? []}
      />
    </div>
  )
}
