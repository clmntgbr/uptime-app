export type CallMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS"

export type CallIpVersion = "any" | "ipv4" | "ipv6"

export interface CallExtraction {
  name: string
  source: "json" | "header" | "status" | "regex"
  expression?: string
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

export interface Call {
  id: string
  name: string
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
