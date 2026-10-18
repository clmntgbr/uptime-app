export interface WorkflowCounts {
  total: number
  active: number
  disabled: number
}

export interface RunCounts {
  total: number
  success: number
  failed: number
  error: number
  skipped: number
  running: number
}

export interface CallCounts {
  total: number
  success: number
  failed: number
  error: number
  skipped: number
}

/** GET /api/stats — dashboard counters for the last `windowHours`. */
export interface DashboardStats {
  windowHours: number
  workflows: WorkflowCounts
  runs: RunCounts
  calls: CallCounts
  successRate: number
}
