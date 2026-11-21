"use client"

import { IncidentSeverityBadge } from "@/components/incident/incident-severity-badge"
import {
  feedEventSubtitle,
  feedKindLabel,
  type FeedEvent,
} from "@/lib/feed/types"
import { formatRelativeTime } from "@/lib/stats/format"

export function FeedRow({
  event,
  onOpen,
}: {
  event: FeedEvent
  onOpen?: () => void
}) {
  const subtitle = [feedEventSubtitle(event), formatRelativeTime(event.at)]
    .filter(Boolean)
    .join(" · ")

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-foreground">
          {event.title || feedKindLabel(event.kind)}
        </span>
        <IncidentSeverityBadge severity={event.severity} />
      </div>
      {subtitle ? (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
    </>
  )

  return (
    <li className="border-b border-border/60 py-2.5 last:border-0 last:pb-0 first:pt-0">
      {onOpen ? (
        <button
          type="button"
          className="flex w-full min-w-0 flex-col gap-1 rounded-md text-start hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          onClick={onOpen}
        >
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 flex-col gap-1">{content}</div>
      )}
    </li>
  )
}
