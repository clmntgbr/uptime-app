"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ApiError } from "@/lib/api-error"
import {
  useAcknowledgeIncident,
  useActiveIncidents,
} from "@/lib/incident/hooks"
import {
  incidentKindLabel,
  type IncidentListItem,
  type IncidentSeverity,
} from "@/lib/incident/types"
import { formatRelativeTime } from "@/lib/stats/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

function severityBadge(severity: IncidentSeverity | string): {
  label: string
  className: string
} {
  switch (severity) {
    case "critical":
      return {
        label: "Critical",
        className:
          "border-transparent bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
      }
    case "warning":
      return {
        label: "Warning",
        className:
          "border-transparent bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
      }
    case "info":
      return {
        label: "Info",
        className:
          "border-transparent bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
      }
    default:
      return {
        label: String(severity),
        className: "border-transparent bg-muted text-muted-foreground",
      }
  }
}

function IncidentRow({
  incident,
  acknowledging,
  onAcknowledge,
}: {
  incident: IncidentListItem
  acknowledging: boolean
  onAcknowledge: (id: string) => void
}) {
  const severity = severityBadge(incident.severity)
  const isOpen = incident.state === "open"

  return (
    <li className="flex items-start justify-between gap-2 border-b border-border/60 py-2 last:border-0 last:pb-0 first:pt-0">
      <div className="min-w-0 flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-foreground">
            {incidentKindLabel(incident.kind)}
          </span>
          <Badge variant="outline" className={cn("text-[10px]", severity.className)}>
            {severity.label}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Opened {formatRelativeTime(incident.openedAt)}
          {!isOpen ? " · Acknowledged" : null}
        </p>
      </div>
      {isOpen ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={acknowledging}
          onClick={() => onAcknowledge(incident.id)}
        >
          {acknowledging ? "…" : "Acknowledge"}
        </Button>
      ) : null}
    </li>
  )
}

export function WorkflowIncidentsCard({ workflowId }: { workflowId: string }) {
  const incidentsQuery = useActiveIncidents(workflowId)
  const acknowledgeMutation = useAcknowledgeIncident(workflowId)

  const members = incidentsQuery.data?.members ?? []
  if (incidentsQuery.isLoading || incidentsQuery.isError) {
    return null
  }
  if (members.length === 0) {
    return null
  }

  const handleAcknowledge = (incidentId: string) => {
    acknowledgeMutation.mutate(incidentId, {
      onSuccess: () => {
        toast.success("Incident acknowledged")
      },
      onError: (error) => {
        const message =
          error instanceof ApiError
            ? error.message
            : "Failed to acknowledge incident"
        toast.error(message)
      },
    })
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card size="sm" className="md:col-span-1">
        <CardHeader className="pb-0">
          <CardTitle>Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col">
            {members.map((incident) => (
              <IncidentRow
                key={incident.id}
                incident={incident}
                acknowledging={
                  acknowledgeMutation.isPending &&
                  acknowledgeMutation.variables === incident.id
                }
                onAcknowledge={handleAcknowledge}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
