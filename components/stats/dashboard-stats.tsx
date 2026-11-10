"use client"

import { CircleHelpIcon } from "lucide-react"
import type { ReactNode } from "react"

import { RunStatusBadge } from "@/components/run/run-status-badge"
import { StatsAreaChart } from "@/components/stats/stats-area-chart"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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

function LatencyAvgLabel() {
  return (
    <span className="inline-flex items-center gap-1">
      Avg latency
      <HoverCard>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="inline-flex size-3.5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            aria-label="What is average latency?"
          >
            <CircleHelpIcon className="size-3.5" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent side="top" align="start" className="w-64 space-y-1.5">
          <p className="font-medium text-foreground">Average latency</p>
          <p className="text-muted-foreground">
            Mean per-call response time over the last 24 hours (successful,
            failed, and error calls with a measured duration).
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
  footerTitle = null,
  footerHint = null,
}: {
  description: ReactNode
  value: ReactNode
  badge?: ReactNode
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
        {badge != null && <CardAction>{badge}</CardAction>}
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
        isRunning || !resolvedStatus ? null : (
          <RunStatusBadge status={resolvedStatus} />
        )
      }
    />
  )
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="@container/card">
          <CardHeader>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-8 w-24" />
          </CardHeader>
          <CardFooter>
            <Skeleton className="h-3 w-16" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-72 w-full rounded-lg" />
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  )
}

export function DashboardCharts({ workflowId }: { workflowId?: string } = {}) {
  const statsQuery = useDashboardStats(workflowId)

  if (statsQuery.isLoading) {
    return <ChartsSkeleton />
  }

  if (statsQuery.error || !statsQuery.data) {
    return null
  }

  return (
    <StatsAreaChart
      runsDaily={statsQuery.data.runs.daily ?? []}
      runsHourly={statsQuery.data.runs.hourly ?? []}
      callDurations={statsQuery.data.callDurations ?? []}
      incidents={statsQuery.data.incidents ?? []}
    />
  )
}

export function DashboardStats({
  workflowId,
  lastRunAt,
  lastStatus,
  isRunning = false,
  showCharts = true,
}: {
  workflowId?: string
  lastRunAt?: string
  lastStatus?: string
  isRunning?: boolean
  showCharts?: boolean
} = {}) {
  const statsQuery = useDashboardStats(workflowId)

  if (statsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <StatsCardsSkeleton />
        {showCharts ? <ChartsSkeleton /> : null}
      </div>
    )
  }

  if (statsQuery.error || !statsQuery.data) {
    return (
      <p className="text-destructive">
        {statsQuery.error?.message ?? "Failed to load stats"}
      </p>
    )
  }

  const { runs, calls, successRate, latencyAvgMs } = statsQuery.data
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
          description={<LatencyAvgLabel />}
          value={formatLatencyMs(latencyAvgMs)}
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

      {showCharts ? (
        <StatsAreaChart
          runsDaily={runs.daily ?? []}
          runsHourly={runs.hourly ?? []}
          callDurations={statsQuery.data.callDurations ?? []}
          incidents={statsQuery.data.incidents ?? []}
        />
      ) : null}
    </div>
  )
}
