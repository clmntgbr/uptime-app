"use client"

import { CallDrawer } from "@/components/call/call-drawer"
import { RunDrawer } from "@/components/run/run-drawer"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cascadeBarStyle } from "@/lib/context/cascade"
import { useContextLatestRun } from "@/lib/context/hooks"
import type { ContextCall } from "@/lib/context/types"
import {
  formatLatencyMs,
  formatRunStatusLabel,
} from "@/lib/stats/format"
import { useRelativeTime } from "@/lib/stats/hooks"
import { useRunWorkflow } from "@/lib/workflow/hooks"
import { cn } from "@/lib/utils"
import { useId, useState } from "react"

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
  const content = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium text-foreground">{call.name}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {formatLatencyMs(call.durationMs)}
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

export function LatestRunCard({ workflowId }: { workflowId: string }) {
  const titleId = useId()
  const query = useContextLatestRun(workflowId)
  const runMutation = useRunWorkflow()
  const [runDrawerOpen, setRunDrawerOpen] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [callDrawerOpen, setCallDrawerOpen] = useState(false)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const relative = useRelativeTime(query.data?.run?.startedAt)

  const openRun = (runId: string) => {
    setSelectedRunId(runId)
    setRunDrawerOpen(true)
  }

  const openCall = (callId: string) => {
    setSelectedCallId(callId)
    setCallDrawerOpen(true)
  }

  return (
    <Card
      size="sm"
      className="bg-white"
      role="region"
      aria-labelledby={titleId}
    >
      <CardHeader className="border-b">
        <CardTitle id={titleId}>Last run</CardTitle>
        {query.data?.run ? (
          <p className="text-muted-foreground">
            {formatLatencyMs(query.data.run.durationMs)} · {relative}
          </p>
        ) : null}
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
        ) : !query.data?.run ? (
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
          <ul className="flex flex-col gap-1">
            {[...query.data.run.calls]
              .sort((a, b) => a.position - b.position)
              .map((call) => (
                <li key={`${call.position}-${call.callId ?? call.name}`}>
                  <CallCascadeRow
                    call={call}
                    runDurationMs={query.data!.run!.durationMs}
                    onOpen={
                      call.callId ? () => openCall(call.callId!) : undefined
                    }
                  />
                </li>
              ))}
          </ul>
        )}
      </CardContent>
      {query.data?.run ? (
        <CardFooter className="border-t">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() => openRun(query.data!.run!.id)}
          >
            View run details
          </Button>
        </CardFooter>
      ) : null}

      <RunDrawer
        workflowId={workflowId}
        runId={selectedRunId}
        open={runDrawerOpen}
        onOpenChange={setRunDrawerOpen}
      />
      <CallDrawer
        workflowId={workflowId}
        callId={selectedCallId}
        open={callDrawerOpen}
        onOpenChange={setCallDrawerOpen}
      />
    </Card>
  )
}
