export type FeedSeverity = "info" | "success" | "warning" | "critical"

export type FeedKind =
  | "call.failed"
  | "call.errored"
  | "call.slow"
  | "run.failed"
  | "run.errored"
  | "run.skipped"
  | "run.timed_out"
  | "incident.opened"
  | "incident.reopened"
  | "incident.acknowledged"
  | "incident.resolved"
  | "tls.threshold_crossed"
  | "tls.expired"
  | "availability.breached"
  | "availability.recovered"
  | "expiry.threshold_crossed"
  | "workflow.created"
  | "workflow.updated"
  | "workflow.deleted"
  | "library.imported"
  | (string & {})

export type FeedEvent = {
  id: string
  kind: FeedKind
  severity: FeedSeverity
  at: string
  title: string
  workflowId?: string
  runId?: string
  callId?: string
  incidentId?: string
  payload: Record<string, unknown>
}

export type FeedListResponse = {
  members: FeedEvent[]
  nextCursor?: string
}

const FEED_KIND_LABELS: Record<string, string> = {
  "call.failed": "Call failed",
  "call.errored": "Call errored",
  "call.slow": "Call slow",
  "run.failed": "Run failed",
  "run.errored": "Run errored",
  "run.skipped": "Run skipped",
  "run.timed_out": "Run timed out",
  "incident.opened": "Incident opened",
  "incident.reopened": "Incident reopened",
  "incident.acknowledged": "Incident acknowledged",
  "incident.resolved": "Incident resolved",
  "tls.threshold_crossed": "TLS threshold",
  "tls.expired": "TLS expired",
  "availability.breached": "Availability breached",
  "availability.recovered": "Availability recovered",
  "expiry.threshold_crossed": "Expiry threshold",
  "workflow.created": "Workflow created",
  "workflow.updated": "Workflow updated",
  "workflow.deleted": "Workflow deleted",
  "library.imported": "Library imported",
}

export function feedKindLabel(kind: string): string {
  return FEED_KIND_LABELS[kind] ?? kind
}

/** Short subtitle from payload (latency, status, ratio…). */
export function feedEventSubtitle(event: FeedEvent): string {
  const p = event.payload ?? {}
  const parts: string[] = []
  if (typeof p.name === "string" && p.name) parts.push(String(p.name))
  if (typeof p.httpStatus === "number") parts.push(String(p.httpStatus))
  if (typeof p.latencyMs === "number") parts.push(`${p.latencyMs} ms`)
  if (typeof p.observed === "string" && p.observed) parts.push(p.observed)
  if (typeof p.daysLeft === "number") {
    parts.push(
      p.daysLeft < 0 ? "expired" : `${p.daysLeft}d left`
    )
  }
  if (typeof p.ratio === "number") parts.push(`${Number(p.ratio).toFixed(1)}%`)
  if (typeof p.reason === "string" && p.reason && parts.length === 0) {
    parts.push(p.reason)
  }
  return parts.join(" · ")
}
