"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CallDayCounts, RunDayCounts } from "@/lib/stats/types"

const chartConfig = {
  runsSuccess: {
    label: "Run success",
    color: "oklch(0.62 0.16 250)",
  },
  runsFailed: {
    label: "Run failed",
    color: "oklch(0.72 0.12 255)",
  },
  callsSuccess: {
    label: "Calls success",
    color: "oklch(0.68 0.15 150)",
  },
  callsFailed: {
    label: "Calls failed",
    color: "oklch(0.78 0.11 155)",
  },
} satisfies ChartConfig

type TimeRange = "30d" | "7d" | "24h"

type ChartDay = {
  date: string
  runsSuccess: number
  runsFailed: number
  callsSuccess: number
  callsFailed: number
}

function daysForRange(range: TimeRange) {
  if (range === "7d") return 7
  return 30
}

function emptyDay(date: string): ChartDay {
  return {
    date,
    runsSuccess: 0,
    runsFailed: 0,
    callsSuccess: 0,
    callsFailed: 0,
  }
}

function shiftUtcDate(date: string, deltaDays: number): string {
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + deltaDays)
  return next.toISOString().slice(0, 10)
}

function mergeDaily(
  runsDaily: RunDayCounts[],
  callsDaily: CallDayCounts[]
): ChartDay[] {
  const byDate = new Map<string, ChartDay>()

  for (const day of runsDaily) {
    byDate.set(day.date, {
      date: day.date,
      runsSuccess: day.success,
      runsFailed: day.failed + day.error,
      callsSuccess: 0,
      callsFailed: 0,
    })
  }

  for (const day of callsDaily) {
    const existing = byDate.get(day.date)
    if (existing) {
      existing.callsSuccess = day.success
      existing.callsFailed = day.failed + day.error
    } else {
      byDate.set(day.date, {
        date: day.date,
        runsSuccess: 0,
        runsFailed: 0,
        callsSuccess: day.success,
        callsFailed: day.failed + day.error,
      })
    }
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  )
}

/** Yesterday / today / tomorrow, with today centered. */
function windowAroundToday(merged: ChartDay[], today: string): ChartDay[] {
  const byDate = new Map(merged.map((day) => [day.date, day]))
  return [-1, 0, 1].map((offset) => {
    const date = shiftUtcDate(today, offset)
    return byDate.get(date) ?? emptyDay(date)
  })
}

export function StatsAreaChart({
  runsDaily,
  callsDaily,
}: {
  runsDaily: RunDayCounts[]
  callsDaily: CallDayCounts[]
}) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("30d")
  const gradientId = React.useId().replace(/:/g, "")

  const filteredData = React.useMemo(() => {
    const merged = mergeDaily(runsDaily, callsDaily)
    if (merged.length === 0) return []

    const today = merged.at(-1)?.date
    if (!today) return []

    if (timeRange === "24h") {
      return windowAroundToday(merged, today)
    }

    const days = daysForRange(timeRange)
    const start = shiftUtcDate(today, -(days - 1))
    return merged.filter((day) => day.date >= start)
  }, [runsDaily, callsDaily, timeRange])

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1"></div>
        <Select
          value={timeRange}
          onValueChange={(value) => setTimeRange(value as TimeRange)}
        >
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ms-auto sm:flex"
            aria-label="Select time range"
          >
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
            <SelectItem value="24h" className="rounded-lg">
              Last 24 hours
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={filteredData}
            margin={{ left: -20, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(`${value}T00:00:00Z`)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickCount={3}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(`${value}T00:00:00Z`).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      }
                    )
                  }}
                />
              }
            />
            <defs>
              <linearGradient
                id={`fillRunsSuccess-${gradientId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-runsSuccess)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-runsSuccess)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id={`fillRunsFailed-${gradientId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-runsFailed)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-runsFailed)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id={`fillCallsSuccess-${gradientId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-callsSuccess)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-callsSuccess)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id={`fillCallsFailed-${gradientId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-callsFailed)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-callsFailed)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="runsFailed"
              type="natural"
              fill={`url(#fillRunsFailed-${gradientId})`}
              fillOpacity={0.4}
              stroke="var(--color-runsFailed)"
              stackId="a"
            />
            <Area
              dataKey="runsSuccess"
              type="natural"
              fill={`url(#fillRunsSuccess-${gradientId})`}
              fillOpacity={0.4}
              stroke="var(--color-runsSuccess)"
              stackId="a"
            />
            <Area
              dataKey="callsFailed"
              type="natural"
              fill={`url(#fillCallsFailed-${gradientId})`}
              fillOpacity={0.4}
              stroke="var(--color-callsFailed)"
              stackId="a"
            />
            <Area
              dataKey="callsSuccess"
              type="natural"
              fill={`url(#fillCallsSuccess-${gradientId})`}
              fillOpacity={0.4}
              stroke="var(--color-callsSuccess)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
