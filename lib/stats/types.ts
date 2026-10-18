export interface WorkflowCounts {
  total: number
  active: number
  disabled: number
}

export interface RunDayCounts {
  date: string
  total: number
  success: number
  failed: number
  error: number
  skipped: number
  running: number
  /** p95 of duration_ms for finished runs that day; null when none. */
  latencyP95Ms: number | null
}

export interface RunCounts {
  total: number
  success: number
  failed: number
  error: number
  skipped: number
  running: number
  daily: RunDayCounts[]
}

export interface CallDayCounts {
  date: string
  total: number
  success: number
  failed: number
  error: number
  skipped: number
}

export interface CallCounts {
  total: number
  success: number
  failed: number
  error: number
  skipped: number
  daily: CallDayCounts[]
}

/** Contiguous failed/error run range. `end` is null while the incident is still open. */
export interface IncidentRange {
  start: string
  end: string | null
}

/** GET /api/statistics — 24h counters + runs/calls daily (~6 months UTC). */
export interface DashboardStats {
  windowHours: number
  workflows: WorkflowCounts
  runs: RunCounts
  calls: CallCounts
  successRate: number
  latencyP95Ms: number | null
  openIncident: boolean
  incidents: IncidentRange[]
}
