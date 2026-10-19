export type RunStatus =
  | "success"
  | "failed"
  | "error"
  | "skipped"
  | "running"

export interface RunCounts {
  success: number
  failed: number
  error: number
  skipped: number
  total: number
}

/** GET /api/workflows/:id/runs member */
export interface RunListItem {
  id: string
  trigger: string
  status: RunStatus | string
  reason?: string
  startedAt: string
  finishedAt?: string
  durationMs: number
  counts: RunCounts
}

export interface RuleRun {
  id: string
  position: number
  subject: string
  operator: string
  text: string
  observed: string
  expected: string
  passed: boolean
}

export interface CallRunError {
  type: string
  message: string
}

export interface CallRun {
  id: string
  callId?: string
  name: string
  position: number
  status: RunStatus | string
  reason?: string
  httpStatus?: number
  request: unknown
  response: unknown
  timings: unknown
  network: unknown
  tls?: unknown
  rules: RuleRun[]
  extractedVariables?: Record<string, string>
  usedVariables?: string[]
  error?: CallRunError
  bodyRef?: string
  bodyHash?: string
  bodyEncoding?: string
  responseKeys?: string[]
  startedAt?: string
  finishedAt?: string
}

/** GET /api/workflows/:id/runs/:runId */
export interface RunDetail {
  id: string
  workflowId: string
  trigger: string
  status: RunStatus | string
  reason?: string
  startedAt: string
  finishedAt?: string
  durationMs: number
  counts: RunCounts
  variables: Record<string, string>
  calls: CallRun[]
}
