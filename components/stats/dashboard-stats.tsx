"use client"

import type { ReactNode } from "react"
import { CircleHelpIcon } from "lucide-react"

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
import { formatLatencyMs, formatRate } from "@/lib/stats/format"
import { useDashboardStats } from "@/lib/stats/hooks"

function LatencyP95Label() {
  return (
    <span className="inline-flex items-center gap-1">
      Latency p95
      <HoverCard>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="inline-flex size-3.5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            aria-label="What is latency p95?"
          >
            <CircleHelpIcon className="size-3.5" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent side="top" align="start" className="w-64 space-y-1.5">
          <p className="font-medium text-foreground">Latency p95</p>
          <p className="text-muted-foreground">
            The 95th percentile of finished run durations over the last 24 hours.
            95% of runs completed at or below this time; the slowest 5% took
            longer.
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
  value: string | number
  badge?: string | null
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
            <Badge variant="outline">{badge}</Badge>
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

export function DashboardStats({
  workflowId,
}: {
  workflowId?: string
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

  const { runs, successRate, latencyP95Ms, openIncident } = statsQuery.data
  const failedRuns = runs.failed + runs.error
  const running = runs.running

  const runsFooter =
    running > 0
      ? `${running} running`
      : failedRuns > 0
        ? `${failedRuns} failed`
        : runs.total > 0
          ? "No failures"
          : null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <StatCard
          description="Availability"
          value={runs.total > 0 ? formatRate(successRate) : "—"}
          badge="24h"
        />
        <StatCard
          description="Runs"
          value={runs.total}
          badge="24h"
          footerTitle={runsFooter}
          footerHint={
            running > 0 && failedRuns > 0 ? `${failedRuns} failed` : null
          }
        />
        <StatCard
          description={<LatencyP95Label />}
          value={formatLatencyMs(latencyP95Ms)}
          badge="24h"
        />
        <StatCard
          description="Open incident"
          value={openIncident ? "Ongoing" : "None"}
          badge={openIncident ? "Active" : null}
        />
      </div>

      <StatsAreaChart
        runsDaily={runs.daily ?? []}
        callsDaily={statsQuery.data.calls.daily ?? []}
      />
    </div>
  )
}
