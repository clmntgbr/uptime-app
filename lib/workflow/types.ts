export interface WorkflowListItem {
  id: string
  name: string
}

export interface Workflow {
  id: string
  name: string
  intervalSeconds: number
  enabled: boolean
  status: string | null
  nextRunAt: string | null
  lastRunAt: string | null
  lastStatus: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkflowStatic {
  name: string
  value: string
}

export interface WorkflowCall {
  name: string
  method?: string
  url: string
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: string
  timeoutMs?: number
  verifyTls?: boolean
  ipVersion?: "any" | "ipv4" | "ipv6"
  proxyUrl?: string
  extractions?: {
    name: string
    source: "json" | "header" | "status" | "regex"
    expression?: string
  }[]
  rules?: {
    subject: string
    operator: string
    target?: string
    value?: string
  }[]
}

/** Body of POST and PUT. A PUT replaces the whole definition. */
export interface WorkflowInput {
  name: string
  intervalSeconds: number
  enabled: boolean
  statics?: WorkflowStatic[]
  calls: WorkflowCall[]
}

export interface WorkflowIdResponse {
  id: string
}
