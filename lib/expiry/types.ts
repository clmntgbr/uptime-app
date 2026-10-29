export type ExpiryType = "tls_certificate"

export type ExpiryItemState = "ok" | "warning" | "expired" | "stale"

export interface ExpiryPolicy {
  type: ExpiryType
  enabled: boolean
  thresholdsDays: number[]
  updatedAt?: string
}

export interface ExpiryPoliciesResponse {
  policies: ExpiryPolicy[]
}

export interface ExpiryItem {
  id: string
  type: ExpiryType
  subject: string
  expiresAt: string
  daysLeft: number
  state: ExpiryItemState
  nextThresholdDays?: number | null
  issuer?: string
  observedAt: string
}

export interface ExpiryItemsResponse {
  items: ExpiryItem[]
}

export interface UpsertExpiryPolicyInput {
  enabled: boolean
  thresholdsDays: number[]
}
