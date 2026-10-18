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
}

export interface CallCounts {
  total: number
  success: number
  failed: number
  error: number
  skipped: number
  daily: CallDayCounts[]
}

/** GET /api/statistics — 24h counters + runs/calls daily (~6 months UTC). */
export interface DashboardStats {
  windowHours: number
  workflows: WorkflowCounts
  runs: RunCounts
  calls: CallCounts
  successRate: number
}
