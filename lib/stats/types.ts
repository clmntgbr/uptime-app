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
  /** p95 of per-call timings.total that day; null when none finished. */
  latencyP95Ms: number | null
}

export interface CallCounts {
  total: number
  success: number
  failed: number
  error: number
  skipped: number
  daily: CallDayCounts[]
}

/** Mean timings.total for one call on one UTC day. */
export interface CallDurationPoint {
  date: string
  durationMs: number
  samples: number
}

/** One call's mean duration over the history window. Stacking a day rebuilds the average run. */
export interface CallDurationSeries {
  id: string
  name: string
  position: number
  daily: CallDurationPoint[]
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
  callDurations: CallDurationSeries[]
}
