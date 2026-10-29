export type ContextRunStatus = "success" | "failed" | "error" | "skipped"

export type ContextCallStatus =
  | "success"
  | "failed"
  | "error"
  | "skipped"
  | "running"

export interface ContextCall {
  callId?: string
  name: string
  position: number
  status: ContextCallStatus
  offsetMs: number
  durationMs: number
  httpStatus?: number
}

export interface ContextRun {
  id: string
  status: ContextRunStatus
  startedAt: string
  durationMs: number
  calls: ContextCall[]
}

/** GET /api/workflows/:id/context/runs/latest */
export interface ContextLatestRunResponse {
  run: ContextRun | null
}

export type ContextVariableScope = "global" | "static" | "workflow"

export type ContextVariableStatus = "ok" | "missing"

export interface ContextVariableProducer {
  callId: string
  name: string
}

export interface ContextVariable {
  scope: ContextVariableScope
  name: string
  value: string | null
  secret: boolean
  truncated?: boolean
  producedBy?: ContextVariableProducer
  status?: ContextVariableStatus | ""
}

/** GET /api/workflows/:id/context/variables */
export interface ContextVariablesResponse {
  variables: ContextVariable[]
}
