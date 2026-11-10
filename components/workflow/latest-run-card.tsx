"use client"

import { CallDrawer } from "@/components/call/call-drawer"
import { RunStatusBadge } from "@/components/run/run-status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cascadeBarStyle } from "@/lib/context/cascade"
import { useContextLatestRun } from "@/lib/context/hooks"
import type { ContextCall } from "@/lib/context/types"
import { formatLatencyMs, formatRunStatusLabel } from "@/lib/stats/format"
import { cn } from "@/lib/utils"
import { useRunWorkflow } from "@/lib/workflow/hooks"
import { useId, useMemo, useState } from "react"

const PREVIEW_LIMIT = 5

function callBarClass(status: string) {
  if (status === "success") return "bg-emerald-500"
  if (status === "failed" || status === "error") return "bg-red-500"
  return "bg-muted-foreground/40"
}

function CallCascadeRow({
  call,
  runDurationMs,
  onOpen,
}: {
  call: ContextCall
  runDurationMs: number
  onOpen?: () => void
}) {
  const bar = cascadeBarStyle(call.offsetMs, call.durationMs, runDurationMs)
  const statusLabel = formatRunStatusLabel(call.status)
  const rightLabel =
    call.status === "skipped" ? "skipped" : formatLatencyMs(call.durationMs)
  const content = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium text-foreground">
          {call.name}
        </span>
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {rightLabel}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 rounded-full",
            callBarClass(call.status)
          )}
          style={{ left: bar.left, width: bar.width }}
        />
      </div>
    </>
  )

  const rowClass =
    "flex w-full flex-col gap-1 rounded-md px-0.5 py-1 text-start"

  return (
    <Tooltip>
      {onOpen ? (
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`${rowClass} transition-colors hover:bg-muted/50`}
            onClick={onOpen}
          >
            {content}
          </button>
        </TooltipTrigger>
      ) : (
        <TooltipTrigger asChild>
          <div className={rowClass}>{content}</div>
        </TooltipTrigger>
      )}
      <TooltipContent side="left" className="max-w-56">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">{call.name}</p>
          <p>
            {statusLabel}
            {call.httpStatus != null ? ` · HTTP ${call.httpStatus}` : null}
          </p>
          <p>
            {formatLatencyMs(call.durationMs)} · starts at{" "}
            {formatLatencyMs(call.offsetMs)}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function CallCascadeList({
  calls,
  runDurationMs,
  onOpenCall,
}: {
  calls: ContextCall[]
  runDurationMs: number
  onOpenCall: (callId: string) => void
}) {
  return (
    <ul className="flex flex-col gap-1">
      {calls.map((call) => (
        <li key={`${call.position}-${call.callId ?? call.name}`}>
          <CallCascadeRow
            call={call}
            runDurationMs={runDurationMs}
            onOpen={call.callId ? () => onOpenCall(call.callId!) : undefined}
          />
        </li>
      ))}
    </ul>
  )
}

export function LatestRunCard({ workflowId }: { workflowId: string }) {
  const titleId = useId()
  const query = useContextLatestRun(workflowId)
  const runMutation = useRunWorkflow()
  const [callDrawerOpen, setCallDrawerOpen] = useState(false)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [allCallsOpen, setAllCallsOpen] = useState(false)

  const openCall = (callId: string) => {
    setSelectedCallId(callId)
    setCallDrawerOpen(true)
  }

  const orderedCalls = useMemo(() => {
    const calls = query.data?.run?.calls ?? []
    return [...calls].sort((a, b) => a.position - b.position)
  }, [query.data?.run?.calls])

  const previewCalls = orderedCalls.slice(0, PREVIEW_LIMIT)
  const hasMore = orderedCalls.length > PREVIEW_LIMIT
  const run = query.data?.run

  return (
    <Card
      size="sm"
      className="h-full bg-card"
      role="region"
      aria-labelledby={titleId}
    >
      <CardHeader className="border-b">
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
          <CardTitle id={titleId} className="justify-self-start">
            Last run
          </CardTitle>
          {run ? (
            <p className="text-center text-muted-foreground tabular-nums">
              {formatLatencyMs(run.durationMs)}
            </p>
          ) : (
            <span />
          )}
          {run ? (
            <div className="justify-self-end">
              <RunStatusBadge status={run.status} />
            </div>
          ) : (
            <span />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : query.error ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-destructive">{query.error.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : !run ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground">No runs yet</p>
            <Button
              type="button"
              size="sm"
              disabled={runMutation.isPending}
              onClick={() => runMutation.mutate(workflowId)}
            >
              {runMutation.isPending ? "Starting…" : "Run"}
            </Button>
          </div>
        ) : (
          <CallCascadeList
            calls={previewCalls}
            runDurationMs={run.durationMs}
            onOpenCall={openCall}
          />
        )}
      </CardContent>
      {run && hasMore ? (
        <CardFooter className="border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={() => setAllCallsOpen(true)}
          >
            See all ({orderedCalls.length})
          </Button>
        </CardFooter>
      ) : null}

      <Dialog open={allCallsOpen} onOpenChange={setAllCallsOpen}>
        <DialogContent className="max-h-[min(80vh,40rem)] overflow-y-auto sm:max-w-md data-open:zoom-in-90 data-closed:zoom-out-95">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pe-8">
              <DialogTitle>Last run calls</DialogTitle>
              {run ? <RunStatusBadge status={run.status} /> : null}
            </div>
            <DialogDescription>
              {run
                ? `${orderedCalls.length} calls · ${formatLatencyMs(run.durationMs)}`
                : null}
            </DialogDescription>
          </DialogHeader>
          {run ? (
            <CallCascadeList
              calls={orderedCalls}
              runDurationMs={run.durationMs}
              onOpenCall={openCall}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <CallDrawer
        workflowId={workflowId}
        callId={selectedCallId}
        open={callDrawerOpen}
        onOpenChange={setCallDrawerOpen}
      />
    </Card>
  )
}
