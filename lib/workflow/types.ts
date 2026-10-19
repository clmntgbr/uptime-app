export interface WorkflowListItem {
  id: string
  name: string
}

/** `once` runs on the next minute tick and `at` at `runAt`; both then disable the workflow. */
export type WorkflowScheduleType = "interval" | "once" | "at"

export interface Workflow {
  id: string
  name: string
  scheduleType: WorkflowScheduleType
  /** Only set when `scheduleType` is `interval`. */
  intervalSeconds?: number
  /** Only set when `scheduleType` is `at` (RFC 3339, UTC). */
  runAt?: string
  enabled: boolean
  /** True while a run is in progress for this workflow. */
  isRunning: boolean
  /** Next scheduled run (RFC 3339); omitted when none / never. */
  nextRunAt?: string
  /** Last finished/started run (RFC 3339); omitted when never run. */
  lastRunAt?: string
  /** Last run status: success | failed | error | skipped. */
  lastStatus?: string
}

export interface WorkflowInput {
  name: string
  scheduleType: WorkflowScheduleType
  intervalSeconds?: number
  runAt?: string
  enabled: boolean
}

export interface WorkflowIdResponse {
  id: string
}

export interface WorkflowRunResponse {
  runId: string
}
