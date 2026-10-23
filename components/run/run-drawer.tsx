"use client"

import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useRun } from "@/lib/run/hooks"
import type { CallRun, RunDetail } from "@/lib/run/types"
import { formatLatencyMs, formatRunStatusLabel } from "@/lib/stats/format"
import { useState } from "react"

function statusBadgeVariant(
  status: string
): "outline" | "destructive" | "secondary" | "default" {
  if (status === "failed" || status === "error") return "destructive"
  if (status === "success") return "secondary"
  if (status === "running") return "default"
  return "outline"
}

function formatDateTime(iso: string | undefined) {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function JsonBlock({ value }: { value: unknown }) {
  if (value == null) {
    return <p className="text-muted-foreground">—</p>
  }
  return (
    <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-2 text-[0.6875rem] leading-relaxed break-all whitespace-pre-wrap">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function KeyValueMap({
  entries,
}: {
  entries: Record<string, string> | undefined
}) {
  const pairs = Object.entries(entries ?? {})
  if (pairs.length === 0) {
    return <p className="text-muted-foreground">None</p>
  }
  return (
    <dl className="divide-y rounded-md border">
      {pairs.map(([key, value]) => (
        <div
          key={key}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-2 px-3 py-1.5"
        >
          <dt className="truncate text-muted-foreground">{key}</dt>
          <dd className="truncate">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function CallSection({ call }: { call: CallRun }) {
  const [open, setOpen] = useState(false)
  const rules = call.rules ?? []

  return (
    <div className="rounded-md border">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-start hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="w-5 text-muted-foreground tabular-nums">
          {call.position + 1}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{call.name}</span>
        {call.httpStatus != null && call.httpStatus > 0 && (
          <span className="text-muted-foreground tabular-nums">
            {call.httpStatus}
          </span>
        )}
        <Badge variant={statusBadgeVariant(call.status)}>
          {formatRunStatusLabel(call.status)}
        </Badge>
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t px-3 py-3">
          {call.reason && (
            <p className="text-muted-foreground">{call.reason}</p>
          )}
          {call.error && (
            <p className="text-destructive">
              {call.error.type}: {call.error.message}
            </p>
          )}
          <div className="grid gap-1">
            <h4 className="font-medium">Request</h4>
            <JsonBlock value={call.request} />
          </div>
          <div className="grid gap-1">
            <h4 className="font-medium">Response</h4>
            <JsonBlock value={call.response} />
          </div>
          <div className="grid gap-1">
            <h4 className="font-medium">Timings</h4>
            <JsonBlock value={call.timings} />
          </div>
          <div className="grid gap-1">
            <h4 className="font-medium">Network</h4>
            <JsonBlock value={call.network} />
          </div>
          {call.tls != null && (
            <div className="grid gap-1">
              <h4 className="font-medium">TLS</h4>
              <JsonBlock value={call.tls} />
            </div>
          )}
          {rules.length > 0 && (
            <div className="grid gap-1">
              <h4 className="font-medium">Rules</h4>
              <ul className="divide-y rounded-md border">
                {rules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex items-start justify-between gap-2 px-3 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{rule.text}</p>
                      <p className="text-muted-foreground">
                        observed {rule.observed ?? "—"} · expected{" "}
                        {rule.expected ?? "—"}
                      </p>
                    </div>
                    <Badge variant={rule.passed ? "secondary" : "destructive"}>
                      {rule.passed ? "Pass" : "Fail"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {call.extractedVariables &&
            Object.keys(call.extractedVariables).length > 0 && (
              <div className="grid gap-1">
                <h4 className="font-medium">Extracted variables</h4>
                <KeyValueMap entries={call.extractedVariables} />
              </div>
            )}
        </div>
      )}
    </div>
  )
}

function RunDetailBody({ run }: { run: RunDetail }) {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusBadgeVariant(run.status)}>
          {formatRunStatusLabel(run.status)}
        </Badge>
        <span className="text-muted-foreground capitalize">{run.trigger}</span>
        <span className="text-muted-foreground tabular-nums">
          {formatLatencyMs(run.durationMs)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        <div>
          <dt className="text-muted-foreground">Started</dt>
          <dd className="tabular-nums">{formatDateTime(run.startedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Finished</dt>
          <dd className="tabular-nums">{formatDateTime(run.finishedAt)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Calls</dt>
          <dd>
            {run.counts.success} ok · {run.counts.failed + run.counts.error}{" "}
            failed · {run.counts.skipped} skipped · {run.counts.total} total
          </dd>
        </div>
        {run.reason && (
          <div className="col-span-2">
            <dt className="text-muted-foreground">Reason</dt>
            <dd>{run.reason}</dd>
          </div>
        )}
      </dl>

      <div className="grid gap-1.5">
        <h3 className="font-medium">Variables</h3>
        <KeyValueMap entries={run.variables} />
      </div>

      <div className="grid gap-1.5">
        <h3 className="font-medium">Calls ({(run.calls ?? []).length})</h3>
        {(run.calls ?? []).length === 0 ? (
          <p className="text-muted-foreground">No calls in this run.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(run.calls ?? []).map((call) => (
              <CallSection key={call.id} call={call} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function RunDrawer({
  workflowId,
  runId,
  open,
  onOpenChange,
}: {
  workflowId: string
  runId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  // runId is kept by the parent while closing so content stays during animation.
  const runQuery = useRun(workflowId, runId)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-lg md:max-w-xl"
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>Run details</SheetTitle>
          <SheetDescription className="text-[0.6875rem]">
            {runId ?? "—"}
          </SheetDescription>
        </SheetHeader>

        {runQuery.isLoading ? (
          <p className="px-4 py-4 text-muted-foreground">Loading…</p>
        ) : runQuery.error ? (
          <p className="px-4 py-4 text-destructive">{runQuery.error.message}</p>
        ) : runQuery.data ? (
          <RunDetailBody run={runQuery.data} />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
