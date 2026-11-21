"use client"

import { Button } from "@/components/ui/button"
import { IncidentSeverityBadge } from "@/components/incident/incident-severity-badge"
import {
  incidentKindLabel,
  type IncidentListItem,
} from "@/lib/incident/types"
import { formatRelativeTime } from "@/lib/stats/format"
import { OVERVIEW_ROW_CLASS } from "@/lib/workflow/overview-cards"
import { cn } from "@/lib/utils"

export function IncidentRow({
  incident,
  callName,
  acknowledging,
  onOpen,
  onAcknowledge,
}: {
  incident: IncidentListItem
  callName?: string
  acknowledging?: boolean
  onOpen?: () => void
  onAcknowledge?: (id: string) => void
}) {
  const isOpen = incident.state === "open"
  const subtitle = [
    callName ? `Call · ${callName}` : null,
    `Opened ${formatRelativeTime(incident.openedAt)}`,
    !isOpen ? "Acknowledged" : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <li
      className={cn(
        OVERVIEW_ROW_CLASS,
        "flex items-center justify-between gap-2"
      )}
    >
      <button
        type="button"
        className="min-w-0 flex flex-1 flex-col gap-1 rounded-md text-start hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        onClick={onOpen}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-foreground">
            {incidentKindLabel(incident.kind)}
          </span>
          <IncidentSeverityBadge severity={incident.severity} />
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </button>
      {isOpen && onAcknowledge ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={acknowledging}
          onClick={(event) => {
            event.stopPropagation()
            onAcknowledge(incident.id)
          }}
        >
          {acknowledging ? "…" : "Acknowledge"}
        </Button>
      ) : null}
    </li>
  )
}
