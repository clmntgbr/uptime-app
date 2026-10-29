"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ApiError } from "@/lib/api-error"
import { useCalls } from "@/lib/call/hooks"
import { EXPIRY_TYPES } from "@/lib/expiry/registry"
import { useExpiryItems, useExpiryPolicies } from "@/lib/expiry/hooks"
import type { ExpiryItem, ExpiryItemState, ExpiryType } from "@/lib/expiry/types"
import { useRunWorkflow, useWorkflow } from "@/lib/workflow/hooks"

function stateBadge(state: ExpiryItemState): {
  label: string
  className: string
} {
  switch (state) {
    case "ok":
      return {
        label: "OK",
        className:
          "border-transparent bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      }
    case "warning":
      return {
        label: "Expires soon",
        className:
          "border-transparent bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
      }
    case "expired":
      return {
        label: "Expired",
        className:
          "border-transparent bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
      }
    case "stale":
      return {
        label: "Not checked recently",
        className: "border-transparent bg-muted text-muted-foreground",
      }
    default:
      return {
        label: String(state),
        className: "border-transparent bg-muted text-muted-foreground",
      }
  }
}

function formatExpiresDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatExpiresFull(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  })
}

/** True when a call may produce a TLS certificate during a run. */
function mayObserveTls(url: string | undefined) {
  if (!url) return false
  const trimmed = url.trim()
  // Explicit HTTP (no TLS).
  if (/^http:\/\//i.test(trimmed)) return false
  // Explicit HTTPS.
  if (/^https:\/\//i.test(trimmed)) return true
  // Templated hosts like {{base_url}}/path usually resolve to HTTPS.
  if (/\{\{/.test(trimmed)) return true
  return false
}

function formatDaysLeft(days: number) {
  return `${days} ${days === 1 || days === -1 ? "day" : "days"}`
}

function formatRunError(error: Error) {
  if (!(error instanceof ApiError)) return error.message
  if (error.code === "RUN_IN_PROGRESS") return "A run is already in progress."
  if (error.code === "NO_RUN_IN_PROGRESS") return "No run is in progress."
  return error.message
}

function DaysLeftCell({ item }: { item: ExpiryItem }) {
  const next =
    item.nextThresholdDays != null
      ? ` · next alert at ${item.nextThresholdDays}`
      : ""
  return (
    <span className="tabular-nums">
      {formatDaysLeft(item.daysLeft)}
      {next}
    </span>
  )
}

export function ExpiryItemsTable({
  workflowId,
  type,
}: {
  workflowId: string
  type: ExpiryType
}) {
  const meta = EXPIRY_TYPES[type]
  const itemsQuery = useExpiryItems(workflowId, type)
  const policiesQuery = useExpiryPolicies(workflowId)
  const callsQuery = useCalls(workflowId)
  const workflowQuery = useWorkflow(workflowId)
  const runMutation = useRunWorkflow()

  const policy = policiesQuery.data?.policies.find((item) => item.type === type)
  const alertsOff = policy != null && !policy.enabled
  const mayHaveTls = (callsQuery.data ?? []).some((call) =>
    mayObserveTls(call.url)
  )
  const isRunning = workflowQuery.data?.isRunning === true
  const items = [...(itemsQuery.data?.items ?? [])].sort(
    (a, b) => a.daysLeft - b.daysLeft
  )

  if (itemsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (itemsQuery.error) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border bg-card p-4">
        <p className="text-sm text-destructive">{itemsQuery.error.message}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void itemsQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    if (callsQuery.isLoading) {
      return (
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-full" />
        </div>
      )
    }
    if (callsQuery.error) {
      return (
        <div className="flex flex-col items-start gap-2 rounded-lg border bg-card p-4">
          <p className="text-sm text-destructive">{callsQuery.error.message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void callsQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      )
    }
    if (!mayHaveTls) {
      return (
        <p className="rounded-lg border border-dashed bg-card px-4 py-6 text-sm text-muted-foreground">
          No HTTPS calls in this workflow, so there is no certificate to watch.
        </p>
      )
    }
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed bg-card px-4 py-6">
        <p className="text-sm text-muted-foreground">
          Certificates are read during runs. Run the workflow to see them.
        </p>
        <Button
          type="button"
          size="sm"
          disabled={runMutation.isPending || isRunning}
          onClick={() => runMutation.mutate(workflowId)}
        >
          {runMutation.isPending || isRunning ? "Starting…" : "Run"}
        </Button>
        {runMutation.error ? (
          <p className="text-sm text-destructive">
            {formatRunError(runMutation.error)}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {alertsOff ? (
        <p className="text-xs text-muted-foreground">Alerts are off</p>
      ) : null}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{meta.subjectLabel}</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-end">Days left</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issuer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const status = stateBadge(item.state)
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <code className="font-mono text-[12.5px]">
                      {item.subject}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">
                          {formatExpiresDate(item.expiresAt)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {formatExpiresFull(item.expiresAt)}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-end">
                    <DaysLeftCell item={item} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.issuer || "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
