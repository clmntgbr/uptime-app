export type RealtimeEventType =
  | "workflow.started"
  | "workflow.finished"
  | "workflow.updated"
  | "call.started"
  | "call.finished"
  | "expiry.alerted"
  | "incident.opened"
  | "incident.acknowledged"
  | "incident.resolved"
  | "incident.reopened"

export interface UserStreamEvent {
  type: string
  eventId?: string
  userId?: string
  workflowId?: string
  runId?: string
  callId?: string
  status?: string
  incidentId?: string
}

const EVENT_TYPES = new Set<string>([
  "workflow.started",
  "workflow.finished",
  "workflow.updated",
  "call.started",
  "call.finished",
  "expiry.alerted",
  "incident.opened",
  "incident.acknowledged",
  "incident.resolved",
  "incident.reopened",
])

/** Strips optional schema version suffix (`workflow.started.v1` → `workflow.started`). */
export function canonicalizeRealtimeType(type: string): string {
  return type.replace(/\.v\d+$/i, "")
}

export function isUserStreamEvent(data: unknown): data is UserStreamEvent {
  if (!data || typeof data !== "object") return false
  const type = (data as { type?: unknown }).type
  if (typeof type !== "string") return false
  return EVENT_TYPES.has(canonicalizeRealtimeType(type))
}

export function eventTypeEquals(
  event: UserStreamEvent,
  type: RealtimeEventType
): boolean {
  return canonicalizeRealtimeType(event.type) === type
}

export function shouldRefreshStats(event: UserStreamEvent): boolean {
  return (
    eventTypeEquals(event, "workflow.started") ||
    eventTypeEquals(event, "workflow.finished")
  )
}
