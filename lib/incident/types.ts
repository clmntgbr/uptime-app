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
