"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatLatencyMs } from "@/lib/stats/format"
import type {
  CallDurationSeries,
  IncidentRange,
  RunDayCounts,
} from "@/lib/stats/types"
import { cn } from "@/lib/utils"

const runsConfig = {
  success: { label: "Success", color: "oklch(0.62 0.16 155)" },
  failed: { label: "Failed", color: "oklch(0.63 0.2 25)" },
} satisfies ChartConfig

const RANGES = [
  { id: "hour", label: "Hour" },
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "6m", label: "6 months" },
] as const

type TimeRange = (typeof RANGES)[number]["id"]

type Bucket = {
  key: string
  label: string
  start: string
  end: string
  success: number
  failed: number
  incident: boolean
}

function shiftUtcDate(date: string, deltaDays: number): string {
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + deltaDays)
  return next.toISOString().slice(0, 10)
}

function utcDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function weekStart(date: string): string {
  const next = new Date(`${date}T00:00:00Z`)
  const day = next.getUTCDay() || 7
  next.setUTCDate(next.getUTCDate() - day + 1)
  return next.toISOString().slice(0, 10)
}

function formatDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

function formatMonth(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  })
}

function overlapsIncident(
  start: string,
  end: string,
  incidents: IncidentRange[]
) {
  return incidents.some((incident) => {
    const incidentStart = utcDay(incident.start)
    const incidentEnd = incident.end ? utcDay(incident.end) : "9999-12-31"
    return incidentStart <= end && incidentEnd >= start
  })
}

function windowDays(range: TimeRange, dates: string[]): string[] {
  const end = dates.at(-1)
  if (!end) return []
  const dayWindow =
    range === "hour" ? 1 : range === "day" ? 30 : range === "week" ? 84 : 183
  const start = shiftUtcDate(end, -(dayWindow - 1))
  return dates.filter((date) => date >= start && date <= end)
}

function buildBuckets(
  range: TimeRange,
  runsDaily: RunDayCounts[],
  dates: string[],
  incidents: IncidentRange[]
): Bucket[] {
  const runsByDate = new Map(runsDaily.map((day) => [day.date, day]))
  const days = windowDays(range, dates)
  if (days.length === 0) return []

  if (range === "hour" || range === "day" || range === "6m") {
    return days.map((date) => {
      const run = runsByDate.get(date)
      return {
        key: date,
        label: formatDay(date),
        start: date,
        end: date,
        success: run?.success ?? 0,
        failed: (run?.failed ?? 0) + (run?.error ?? 0),
        incident: overlapsIncident(date, date, incidents),
      }
    })
  }

  const groups = new Map<string, Bucket>()
  for (const date of days) {
    const key = range === "week" ? weekStart(date) : date.slice(0, 7)
    const run = runsByDate.get(date)
    const existing = groups.get(key)
    if (!existing) {
      groups.set(key, {
        key,
        label: range === "week" ? formatDay(key) : formatMonth(`${key}-01`),
        start: date,
        end: date,
        success: run?.success ?? 0,
        failed: (run?.failed ?? 0) + (run?.error ?? 0),
        incident: false,
      })
      continue
    }
    existing.end = date
    existing.success += run?.success ?? 0
    existing.failed += (run?.failed ?? 0) + (run?.error ?? 0)
  }

  return Array.from(groups.values()).map((bucket) => ({
    ...bucket,
    incident: overlapsIncident(bucket.start, bucket.end, incidents),
  }))
}

function incidentBand(props: BarShapeProps) {
  const background = props.background
  const payload = props.payload as { incident?: boolean } | undefined
  if (
    !payload?.incident ||
    background?.x == null ||
    background.y == null ||
    background.width == null ||
    background.height == null
  ) {
    return <g />
  }
  return (
    <rect
      x={background.x}
      y={background.y}
      width={background.width}
      height={background.height}
      fill="oklch(0.63 0.2 25)"
      fillOpacity={0.15}
    />
  )
}

function callColor(index: number, count: number) {
  const t = count <= 1 ? 0.72 : index / (count - 1)
  const lightness = 0.9 - t * 0.46
  const chroma = 0.035 + t * 0.13
  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} 250)`
}

function seriesKey(id: string) {
  return `call_${id.replace(/[^a-zA-Z0-9_]/g, "_")}`
}

type DurationCall = {
  key: string
  name: string
  color: string
}

function bucketKeyFor(range: TimeRange, date: string) {
  if (range === "week") return weekStart(date)
  if (range === "month") return date.slice(0, 7)
  return date
}

function buildDuration(
  range: TimeRange,
  series: CallDurationSeries[],
  dates: string[],
  incidents: IncidentRange[]
): { rows: Record<string, string | number | boolean>[]; calls: DurationCall[] } {
  const days = windowDays(range, dates)
  if (days.length === 0) return { rows: [], calls: [] }

  const daySet = new Set(days)
  const buckets = new Map<
    string,
    { key: string; label: string; start: string; end: string }
  >()
  for (const date of days) {
    const key = bucketKeyFor(range, date)
    const existing = buckets.get(key)
    if (!existing) {
      buckets.set(key, {
        key,
        label:
          range === "month" ? formatMonth(`${key}-01`) : formatDay(key),
        start: date,
        end: date,
      })
      continue
    }
    existing.end = date
  }

  const totals = new Map<string, Map<string, { duration: number; samples: number }>>()
  const used = new Set<string>()
  const ordered = [...series].sort(
    (a, b) => a.position - b.position || a.name.localeCompare(b.name)
  )

  for (const call of ordered) {
    const key = seriesKey(call.id)
    for (const point of call.daily ?? []) {
      if (!daySet.has(point.date) || point.samples <= 0) continue
      const bucket = bucketKeyFor(range, point.date)
      let calls = totals.get(bucket)
      if (!calls) {
        calls = new Map()
        totals.set(bucket, calls)
      }
      const current = calls.get(key) ?? { duration: 0, samples: 0 }
      current.duration += point.durationMs * point.samples
      current.samples += point.samples
      calls.set(key, current)
      used.add(key)
    }
  }

  const calls = ordered
    .filter((call) => used.has(seriesKey(call.id)))
    .map((call, index, visible) => ({
      key: seriesKey(call.id),
      name: call.name,
      color: callColor(index, visible.length),
    }))

  const rows = Array.from(buckets.values()).map((bucket) => {
    const row: Record<string, string | number | boolean> = {
      key: bucket.key,
      label: bucket.label,
      incident: overlapsIncident(bucket.start, bucket.end, incidents),
    }
    const values = totals.get(bucket.key)
    for (const call of calls) {
      const value = values?.get(call.key)
      if (value && value.samples > 0) {
        row[call.key] = Math.round(value.duration / value.samples)
      }
    }
    return row
  })

  return { rows, calls }
}

function TimeRangeToggle({
  value,
  onChange,
}: {
  value: TimeRange
  onChange: (value: TimeRange) => void
}) {
  return (
    <div
      className="inline-flex shrink-0 rounded-full border bg-background p-0.5"
      role="group"
      aria-label="Time range"
    >
      {RANGES.map((range) => (
        <button
          key={range.id}
          type="button"
          aria-pressed={value === range.id}
          onClick={() => onChange(range.id)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs text-muted-foreground transition-colors",
            value === range.id && "bg-muted font-medium text-foreground"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}

export function StatsAreaChart({
  runsDaily,
  callDurations = [],
  incidents = [],
}: {
  runsDaily: RunDayCounts[]
  callDurations?: CallDurationSeries[]
  incidents?: IncidentRange[]
}) {
  const [runsRange, setRunsRange] = React.useState<TimeRange>("day")
  const [durationRange, setDurationRange] = React.useState<TimeRange>("day")
  const dates = React.useMemo(() => {
    const keys = new Set(runsDaily.map((day) => day.date))
    for (const call of callDurations) {
      for (const point of call.daily ?? []) keys.add(point.date)
    }
    return Array.from(keys).sort()
  }, [runsDaily, callDurations])
  const buckets = React.useMemo(
    () => buildBuckets(runsRange, runsDaily, dates, incidents),
    [runsRange, runsDaily, dates, incidents]
  )
  const duration = React.useMemo(
    () => buildDuration(durationRange, callDurations, dates, incidents),
    [durationRange, callDurations, dates, incidents]
  )
  const durationConfig = React.useMemo(
    () =>
      Object.fromEntries(
        duration.calls.map((call) => [
          call.key,
          { label: call.name, color: call.color },
        ])
      ) satisfies ChartConfig,
    [duration.calls]
  )
  const tickLabel = (value: unknown) => {
    const key = String(value ?? "")
    return buckets.find((bucket) => bucket.key === key)?.label ?? key
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="pt-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-4">
            <CardTitle>Runs</CardTitle>
            <TimeRangeToggle value={runsRange} onChange={setRunsRange} />
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-4">
            <ChartContainer
              config={runsConfig}
              className="aspect-auto h-[220px] w-full"
            >
              <BarChart data={buckets} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="key"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tickFormatter={tickLabel}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={tickLabel} />}
                />
                <Bar
                  dataKey="success"
                  stackId="runs"
                  fill="var(--color-success)"
                  background={incidentBand}
                />
                <Bar
                  dataKey="failed"
                  stackId="runs"
                  fill="var(--color-failed)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="pt-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-4">
            <CardTitle>Duration</CardTitle>
            <TimeRangeToggle
              value={durationRange}
              onChange={setDurationRange}
            />
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-4">
            <ChartContainer
              config={durationConfig}
              className="aspect-auto h-[220px] w-full"
            >
              <BarChart data={duration.rows} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="key"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tickFormatter={(value) => {
                    const key = String(value ?? "")
                    const row = duration.rows.find((item) => item.key === key)
                    return typeof row?.label === "string" ? row.label : key
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(value) => formatLatencyMs(Number(value))}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        const key = String(value ?? "")
                        const row = duration.rows.find((item) => item.key === key)
                        return typeof row?.label === "string" ? row.label : key
                      }}
                      formatter={(value, name, item) => {
                        const key = String(
                          (item as { dataKey?: unknown }).dataKey ?? name
                        )
                        const call = duration.calls.find((item) => item.key === key)
                        return (
                          <>
                            <div
                              className="size-2.5 shrink-0 rounded-[2px]"
                              style={{ background: call?.color }}
                            />
                            <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                              <span className="text-muted-foreground">
                                {call?.name ?? key}
                              </span>
                              <span className="font-medium text-foreground tabular-nums">
                                {formatLatencyMs(Number(value))}
                              </span>
                            </div>
                          </>
                        )
                      }}
                    />
                  }
                />
                {duration.calls.map((call, index) => (
                  <Bar
                    key={call.key}
                    dataKey={call.key}
                    stackId="duration"
                    fill={call.color}
                    background={index === 0 ? incidentBand : undefined}
                    radius={
                      index === duration.calls.length - 1
                        ? [3, 3, 0, 0]
                        : undefined
                    }
                  />
                ))}
              </BarChart>
            </ChartContainer>
            {duration.calls.length > 0 ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 px-2 pt-3 text-xs text-muted-foreground">
                {duration.calls.map((call) => (
                  <li key={call.key} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-[2px]"
                      style={{ background: call.color }}
                    />
                    {call.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2 pt-3 text-xs text-muted-foreground">
                No call durations in this range.
              </p>
            )}
          </CardContent>
        </Card>
    </div>
  )
}
