export type CallMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS"

export type CallIpVersion = "any" | "ipv4" | "ipv6"

/** Shape of `extractions` on POST/PUT /calls (not the variables API). */
export interface CallExtraction {
  name: string
  source: "json" | "header" | "status" | "regex"
  expression?: string
  secret?: boolean
}

export interface CallRule {
  subject:
    | "status"
    | "response_time"
    | "body"
    | "json"
    | "header"
    | "size"
    | "certificate"
  operator:
    | "is"
    | "is_not"
    | "in"
    | "exceeds"
    | "below"
    | "contains"
    | "not_contains"
    | "exists"
    | "not_exists"
    | "expires_within"
    | "chain_invalid"
    | "name_mismatch"
  target?: string
  value?: string
}

export interface CallInput {
  name: string
  method?: CallMethod
  url: string
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: string
  timeoutMs?: number
  verifyTls?: boolean
  ipVersion?: CallIpVersion
  proxyUrl?: string
  extractions?: CallExtraction[]
  rules?: CallRule[]
}

/** One point in `Call.recentRuns` (oldest → newest, max 24). */
export interface CallRecentRun {
  id: string
  runId: string
  status: string
  httpStatus?: number
  finishedAt?: string
  latencyMs?: number
}

export interface Call {
  id: string
  name: string
  method?: CallMethod | string
  url?: string
  position?: number
  lastStatus?: string
  lastHttpStatus?: number
  lastFinishedAt?: string
  lastLatencyMs?: number
  /** Last runs for this call, oldest first (max 24). */
  recentRuns?: CallRecentRun[]
}

export interface CallDetail extends Call {
  method: CallMethod
  url: string
  headers: Record<string, string>
  query: Record<string, string>
  body: string
  timeoutMs: number
  verifyTls: boolean
  ipVersion: CallIpVersion
  proxyUrl: string
}
