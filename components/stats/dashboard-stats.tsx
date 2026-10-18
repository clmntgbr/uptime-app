"use client"

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
import { useDashboardStats } from "@/lib/stats/hooks"
import type { CallDayCounts, RunDayCounts } from "@/lib/stats/types"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

function formatRate(rate: number) {
  return `${(rate * 100).toFixed(rate > 0 && rate < 0.01 ? 1 : 0)}%`
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function todayRuns(daily: RunDayCounts[]): RunDayCounts {
  const today = utcToday()
  return (
    daily.find((day) => day.date === today) ?? {
      date: today,
      total: 0,
      success: 0,
      failed: 0,
      error: 0,
      skipped: 0,
      running: 0,
    }
  )
}

function todayCalls(daily: CallDayCounts[]): CallDayCounts {
  const today = utcToday()
  return (
    daily.find((day) => day.date === today) ?? {
      date: today,
      total: 0,
      success: 0,
      failed: 0,
      error: 0,
      skipped: 0,
    }
  )
}

function StatCard({
  description,
  value,
  badge = null,
  footerTitle = null,
  footerHint = null,
  trendingUp = null,
}: {
  description: string
  value: string | number
  badge?: string | null
  footerTitle?: string | null
  footerHint?: string | null
  trendingUp?: boolean | null
}) {
  const showTrend = trendingUp != null
  const TrendIcon = trendingUp === false ? IconTrendingDown : IconTrendingUp
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
            <Badge variant="outline">
              {showTrend && <TrendIcon />}
              {badge}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {showFooter && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {footerTitle != null && (
            <div className="line-clamp-1 flex gap-2 font-medium">
              {footerTitle}
              {showTrend && <TrendIcon className="size-4" />}
            </div>
          )}
          {footerHint != null && (
            <div className="text-muted-foreground">{footerHint}</div>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

export function DashboardStats() {
  const statsQuery = useDashboardStats()

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

  const { workflows, runs, calls } = statsQuery.data
  const runsToday = todayRuns(runs.daily ?? [])
  const callsToday = todayCalls(calls.daily ?? [])
  const runsFailedToday = runsToday.failed + runsToday.error
  const callsFailedToday = callsToday.failed + callsToday.error
  const todayRate =
    runsToday.total > 0 ? runsToday.success / runsToday.total : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <StatCard
          description="Success rate"
          value={formatRate(todayRate)}
          badge="Today"
        />
        <StatCard description="Active Workflows" value={workflows.active} />
        <StatCard
          description="Workflow Runs"
          value={runsToday.total}
          badge="Today"
        />
        <StatCard
          description="Workflow Successful Runs"
          value={runsToday.success}
          badge={formatRate(todayRate)}
        />
        <StatCard
          description="Workflow Error Runs"
          value={runsFailedToday}
          badge={formatRate(1 - todayRate)}
        />
        <StatCard description="Calls" value={callsToday.total} badge="Today" />
        <StatCard
          description="Successful Calls"
          value={callsToday.success}
          badge="Today"
        />
        <StatCard
          description="Failed Calls"
          value={callsFailedToday}
          badge="Today"
        />
      </div>

      <StatsAreaChart
        runsDaily={runs.daily ?? []}
        callsDaily={calls.daily ?? []}
      />
    </div>
  )
}
