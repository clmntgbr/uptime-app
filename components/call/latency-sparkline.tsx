"use client"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import type { CallRecentRun } from "@/lib/call/types"
import { cn } from "@/lib/utils"

const SPARK_MIN_PX = 3
const SPARK_MAX_PX = 24

export function sparkBarClass(status: string | undefined) {
  if (status === "success") return "bg-[#8FD2B0] dark:bg-emerald-400/80"
  if (status === "failed") return "bg-orange-400 dark:bg-orange-400/90"
  if (status === "error") return "bg-red-500 dark:bg-red-400"
  if (status === "skipped") return "bg-muted-foreground/35"
  if (status === "running") return "bg-sky-400"
  return "bg-muted-foreground/30"
}

function formatTimingMs(ms: number) {
  if (!Number.isFinite(ms)) return "—"
  if (Math.abs(ms) < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  return `${seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1)}s`
}

function formatHoverStamp(iso: string | undefined) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  })
  const day = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
  return `${time} · ${day}`
}

function timingRows(run: CallRecentRun) {
  const dns = run.timings?.dns ?? 0
  const connect = run.timings?.connect ?? 0
  const tls = run.timings?.tls ?? 0
  const transfer = run.timings?.transfer ?? 0
  const waiting = Math.max(
    0,
    (run.latencyMs ?? 0) - dns - connect - tls - transfer
  )
  return [
    { key: "dns", label: "Name lookup", swatch: "bg-violet-500", ms: dns },
    { key: "connect", label: "Connection", swatch: "bg-blue-500", ms: connect },
    { key: "tls", label: "TLS handshake", swatch: "bg-teal-400", ms: tls },
    { key: "waiting", label: "Waiting", swatch: "bg-amber-400", ms: waiting },
    {
      key: "transfer",
      label: "Data transfer",
      swatch: "bg-emerald-500",
      ms: transfer,
    },
  ]
}

export function LatencySparkline({
  runs,
  className,
  scale = 1,
}: {
  runs: CallRecentRun[]
  className?: string
  /** Scales bar size for zoomable surfaces (e.g. workflow canvas). */
  scale?: number
}) {
  if (!runs.length) return null

  const maxLatency = Math.max(1, ...runs.map((run) => run.latencyMs ?? 0))
  const minPx = Math.max(1, Math.round(SPARK_MIN_PX * scale))
  const maxPx = Math.max(minPx + 1, Math.round(SPARK_MAX_PX * scale))
  const rowH = Math.max(minPx + 2, Math.round(24 * scale))
  const hitW = Math.max(2, Math.round(6 * scale))
  const barW = Math.max(1, Math.round(4 * scale))
  const gap = Math.max(0.5, 2 * scale)

  return (
    <div
      className={cn("flex items-end", className)}
      style={{ height: rowH, gap }}
      role="img"
      aria-label={`Latency of the last ${runs.length} runs`}
      data-no-pan
      onPointerDown={(event) => event.stopPropagation()}
    >
      {runs.map((run) => {
        const ratio = (run.latencyMs ?? 0) / maxLatency
        const height = Math.max(minPx, Math.round(ratio * maxPx))
        const total =
          run.latencyMs != null ? formatTimingMs(run.latencyMs) : null
        const stamp = formatHoverStamp(run.finishedAt)
        const status =
          run.status.charAt(0).toUpperCase() + run.status.slice(1)
        const phases = timingRows(run)
        const phaseMax = Math.max(1, ...phases.map((phase) => phase.ms))

        return (
          <HoverCard key={run.id} openDelay={120} closeDelay={80}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="flex items-end justify-center"
                style={{ height: rowH, width: hitW }}
                aria-label={[stamp, total, run.status]
                  .filter(Boolean)
                  .join(", ")}
              >
                <span
                  className={cn("block rounded-[1px]", sparkBarClass(run.status))}
                  style={{ height, width: barW }}
                />
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="w-64 p-3">
              <div className="flex flex-col gap-3">
                {stamp && (
                  <p className="text-[11px] text-muted-foreground">{stamp}</p>
                )}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        sparkBarClass(run.status)
                      )}
                    />
                    {status}
                  </span>
                  {run.httpStatus != null && (
                    <span className="text-muted-foreground">
                      HTTP {run.httpStatus}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {total ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="flex flex-col gap-2 border-t border-border pt-2.5">
                  {phases.map((phase) => {
                    const width = Math.round((phase.ms / phaseMax) * 100)
                    return (
                      <div key={phase.key} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-[2px]",
                              phase.swatch
                            )}
                          />
                          <span className="min-w-0 flex-1">{phase.label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatTimingMs(phase.ms)}
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full", phase.swatch)}
                            style={{
                              width: `${phase.ms > 0 ? Math.max(width, 6) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )
      })}
    </div>
  )
}
