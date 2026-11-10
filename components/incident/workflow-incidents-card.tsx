"use client"

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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { IncidentDetailDrawer } from "@/components/incident/incident-detail-drawer"
import { IncidentRow } from "@/components/incident/incident-row"
import { IncidentsListDrawer } from "@/components/incident/incidents-list-drawer"
import { LatestRunCard } from "@/components/workflow/latest-run-card"
import { ApiError } from "@/lib/api-error"
import { useCalls } from "@/lib/call/hooks"
import {
  useAcknowledgeIncident,
  useActiveIncidents,
} from "@/lib/incident/hooks"
import { SHEET_CLOSE_MS } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { CheckCircle2Icon } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

const PREVIEW_LIMIT = 4

export function WorkflowIncidentsCard({ workflowId }: { workflowId: string }) {
  const incidentsQuery = useActiveIncidents(workflowId)
  const callsQuery = useCalls(workflowId)
  const acknowledgeMutation = useAcknowledgeIncident(workflowId)

  const [listOpen, setListOpen] = useState(false)
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
  const incidentsReady =
    !incidentsQuery.isLoading && !incidentsQuery.isError
  const preview = members.slice(0, PREVIEW_LIMIT)
  const hasMore = total > PREVIEW_LIMIT
  const isEmpty = members.length === 0

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!incidentsReady ? (
          <Card size="sm" className="h-full md:col-span-1">
            <CardHeader className="pb-0">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-4/5" />
            </CardContent>
          </Card>
        ) : (
          <Card size="sm" className="h-full md:col-span-1">
            <CardHeader className="pb-0">
              <CardTitle>Incidents</CardTitle>
            </CardHeader>
            <CardContent
              className={cn(
                "flex-1",
                isEmpty && "flex items-center justify-center"
              )}
            >
              {isEmpty ? (
                <Empty className="border-0 p-4 md:p-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CheckCircle2Icon />
                    </EmptyMedia>
                    <EmptyTitle>No active incidents</EmptyTitle>
                    <EmptyDescription>
                      This workflow is healthy right now.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ul className="flex flex-col">
                  {preview.map((incident) => (
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
            </CardContent>
            {hasMore ? (
              <CardFooter className="mt-auto border-t pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-0"
                  onClick={() => setListOpen(true)}
                >
                  See all ({total})
                </Button>
              </CardFooter>
            ) : null}
          </Card>
        )}
        <div className="h-full md:col-span-1">
          <LatestRunCard workflowId={workflowId} />
        </div>
      </div>

      <IncidentsListDrawer
        workflowId={workflowId}
        open={listOpen}
        onOpenChange={setListOpen}
      />

      <IncidentDetailDrawer
        workflowId={workflowId}
        incidentId={detailId}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
      />
    </>
  )
}
