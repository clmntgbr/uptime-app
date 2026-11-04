"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  SHEET_CLOSE_MS,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { IncidentDetailDrawer } from "@/components/incident/incident-detail-drawer"
import { IncidentRow } from "@/components/incident/incident-row"
import { ApiError } from "@/lib/api-error"
import { useCalls } from "@/lib/call/hooks"
import {
  useAcknowledgeIncident,
  useActiveIncidents,
} from "@/lib/incident/hooks"
import { useMemo, useState } from "react"
import { toast } from "sonner"

export function IncidentsListDrawer({
  workflowId,
  open,
  onOpenChange,
}: {
  workflowId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const incidentsQuery = useActiveIncidents(workflowId)
  const callsQuery = useCalls(workflowId)
  const acknowledgeMutation = useAcknowledgeIncident(workflowId)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const callNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const call of callsQuery.data ?? []) {
      map.set(call.id, call.name)
    }
    return map
  }, [callsQuery.data])

  const members = incidentsQuery.data?.members ?? []
  const total = incidentsQuery.data?.total ?? members.length

  const openDetail = (id: string) => {
    setDetailId(id)
    setDetailOpen(true)
  }

  const handleDetailOpenChange = (next: boolean) => {
    setDetailOpen(next)
    if (!next) {
      window.setTimeout(() => setDetailId(null), SHEET_CLOSE_MS + 50)
    }
  }

  const handleAcknowledge = (incidentId: string) => {
    acknowledgeMutation.mutate(incidentId, {
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
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Incidents</SheetTitle>
            <SheetDescription>
              {total === 1
                ? "1 active incident on this workflow."
                : `${total} active incidents on this workflow.`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-3 px-4 pb-6">
            {incidentsQuery.isLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : incidentsQuery.error ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-destructive">
                  {incidentsQuery.error.message}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void incidentsQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active incidents.
              </p>
            ) : (
              <ul className="flex flex-col">
                {members.map((incident) => (
                  <IncidentRow
                    key={incident.id}
                    incident={incident}
                    callName={
                      incident.callId
                        ? callNameById.get(incident.callId)
                        : undefined
                    }
                    acknowledging={
                      acknowledgeMutation.isPending &&
                      acknowledgeMutation.variables === incident.id
                    }
                    onOpen={() => openDetail(incident.id)}
                    onAcknowledge={handleAcknowledge}
                  />
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <IncidentDetailDrawer
        nested
        workflowId={workflowId}
        incidentId={detailId}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
      />
    </>
  )
}
