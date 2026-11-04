"use client"

import { Button } from "@/components/ui/button"
import { DrawerFormSkeleton } from "@/components/ui/drawer-form-skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { IncidentSeverityBadge } from "@/components/incident/incident-severity-badge"
import { ApiError } from "@/lib/api-error"
import { useCalls } from "@/lib/call/hooks"
import { formatIncidentCause } from "@/lib/incident/cause"
import {
  useAcknowledgeIncident,
  useIncident,
} from "@/lib/incident/hooks"
import {
  incidentEventLabel,
  incidentKindLabel,
  incidentStateLabel,
} from "@/lib/incident/types"
import { formatRelativeTime } from "@/lib/stats/format"
import { useMemo } from "react"
import { toast } from "sonner"

function formatAbsolute(iso: string | undefined) {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function IncidentDetailDrawer({
  workflowId,
  incidentId,
  open,
  onOpenChange,
  nested = false,
}: {
  workflowId: string
  incidentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  nested?: boolean
}) {
  const detailQuery = useIncident(open ? incidentId : null)
  const callsQuery = useCalls(workflowId)
  const acknowledgeMutation = useAcknowledgeIncident(workflowId)

  const callNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const call of callsQuery.data ?? []) {
      map.set(call.id, call.name)
    }
    return map
  }, [callsQuery.data])

  const detail = detailQuery.data
  const callName = detail?.callId
    ? callNameById.get(detail.callId) ?? detail.callId
    : null
  const causeLines = formatIncidentCause(detail?.cause, callNameById)
  const isOpen = detail?.state === "open"

  const handleAcknowledge = () => {
    if (!detail) return
    acknowledgeMutation.mutate(detail.id, {
      onSuccess: () => toast.success("Incident acknowledged"),
      onError: (error) => {
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Failed to acknowledge incident"
        )
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        nested={nested}
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>
            {detail ? incidentKindLabel(detail.kind) : "Incident"}
          </SheetTitle>
          <SheetDescription>
            {detail
              ? `${incidentStateLabel(detail.state)} · opened ${formatRelativeTime(detail.openedAt)}`
              : "Incident details"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          {detailQuery.isLoading ? (
            <DrawerFormSkeleton fields={4} />
          ) : detailQuery.error ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-destructive">
                {detailQuery.error.message}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void detailQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : detail ? (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <IncidentSeverityBadge severity={detail.severity} />
                <span className="text-xs text-muted-foreground">
                  {incidentStateLabel(detail.state)}
                </span>
                {detail.reopenCount > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    · Reopened {detail.reopenCount}×
                  </span>
                ) : null}
              </div>

              <dl className="grid gap-3 text-sm">
                {callName ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Call</dt>
                    <dd className="font-medium">{callName}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-muted-foreground">Opened</dt>
                  <dd>{formatAbsolute(detail.openedAt)}</dd>
                </div>
                {detail.acknowledgedAt ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Acknowledged
                    </dt>
                    <dd>{formatAbsolute(detail.acknowledgedAt)}</dd>
                  </div>
                ) : null}
                {detail.resolvedAt ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Resolved</dt>
                    <dd>{formatAbsolute(detail.resolvedAt)}</dd>
                  </div>
                ) : null}
              </dl>

              {causeLines.length > 0 ? (
                <section className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Details
                  </h3>
                  <ul className="rounded-md border bg-card px-3 py-2 text-sm">
                    {causeLines.map((line) => (
                      <li
                        key={line}
                        className="border-b border-border/50 py-1.5 last:border-0 last:pb-0 first:pt-0"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {detail.events.length > 0 ? (
                <section className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Timeline
                  </h3>
                  <ol className="flex flex-col gap-2">
                    {[...detail.events].reverse().map((event, index) => (
                      <li
                        key={`${event.at}-${event.type}-${index}`}
                        className="rounded-md border px-3 py-2"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium">
                            {incidentEventLabel(event.type)}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatRelativeTime(event.at)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatAbsolute(event.at)}
                          {event.runId ? ` · Run ${event.runId.slice(0, 8)}` : ""}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {isOpen ? (
                <Button
                  type="button"
                  disabled={acknowledgeMutation.isPending}
                  onClick={handleAcknowledge}
                >
                  {acknowledgeMutation.isPending
                    ? "Acknowledging…"
                    : "Acknowledge"}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
