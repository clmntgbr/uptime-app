"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { IncidentDetailDrawer } from "@/components/incident/incident-detail-drawer"
import { IncidentRow } from "@/components/incident/incident-row"
import { IncidentsListDrawer } from "@/components/incident/incidents-list-drawer"
import { ApiError } from "@/lib/api-error"
import { useCalls } from "@/lib/call/hooks"
import {
  useAcknowledgeIncident,
  useActiveIncidents,
} from "@/lib/incident/hooks"
import { SHEET_CLOSE_MS } from "@/components/ui/sheet"
import { useMemo, useState } from "react"
import { toast } from "sonner"

const PREVIEW_LIMIT = 3

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

  if (incidentsQuery.isLoading || incidentsQuery.isError) {
    return null
  }
  if (members.length === 0) {
    return null
  }

  const preview = members.slice(0, PREVIEW_LIMIT)
  const hasMore = total > PREVIEW_LIMIT

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm" className="md:col-span-1">
          <CardHeader className="pb-0">
            <CardTitle>Incidents</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
          {hasMore ? (
            <CardFooter className="border-t pt-3">
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
