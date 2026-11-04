export type IncidentKind =
  | "call_failed"
  | "workflow_failed"
  | "call_slow"
  | "chain_broken"
  | "availability_low"
  | "no_run"
  | "tls_expiry"

export type IncidentSeverity = "info" | "warning" | "critical"

export type IncidentState = "open" | "acknowledged" | "resolved"

export interface IncidentListItem {
  id: string
  kind: IncidentKind | string
  callId?: string
  severity: IncidentSeverity | string
  state: IncidentState | string
  openedAt: string
  resolvedAt?: string
  reopenCount: number
}

export interface IncidentListResponse {
  members: IncidentListItem[]
  page: number
  limit: number
  totalPages: number
  total: number
}

export type IncidentEventType =
  | "opened"
  | "failing"
  | "acknowledged"
  | "resolved"
  | "reopened"
  | "reminder"
  | string

export interface IncidentEvent {
  at: string
  type: IncidentEventType
  runId?: string
  payload: Record<string, unknown>
}

export interface IncidentDetail {
  id: string
  workflowId: string
  kind: IncidentKind | string
  callId?: string
  fingerprint: string
  severity: IncidentSeverity | string
  state: IncidentState | string
  cause: Record<string, unknown>
  openedAt: string
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  reopenCount: number
  events: IncidentEvent[]
}

export const INCIDENT_KIND_LABELS: Record<string, string> = {
  call_failed: "Call failed",
  workflow_failed: "Workflow failed",
  call_slow: "Call slow",
  chain_broken: "Chain broken",
  availability_low: "Availability low",
  no_run: "No run",
  tls_expiry: "TLS expiry",
}

export function incidentKindLabel(kind: string): string {
  return INCIDENT_KIND_LABELS[kind] ?? kind
}

export function incidentStateLabel(state: string): string {
  switch (state) {
    case "open":
      return "Open"
    case "acknowledged":
      return "Acknowledged"
    case "resolved":
      return "Resolved"
    default:
      return state
  }
}

export function incidentEventLabel(type: string): string {
  switch (type) {
    case "opened":
      return "Opened"
    case "failing":
      return "Still failing"
    case "acknowledged":
      return "Acknowledged"
    case "resolved":
      return "Resolved"
    case "reopened":
      return "Reopened"
    case "reminder":
      return "Reminder sent"
    default:
      return type
  }
}
