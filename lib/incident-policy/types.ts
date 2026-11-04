import type { IncidentKind, IncidentSeverity } from "@/lib/incident/types"

export type IncidentPolicy = {
  kind: IncidentKind
  enabled: boolean
  severity: IncidentSeverity
  openAfter: number
  closeAfter: number
  params: {
    threshold?: number
    recoveryThreshold?: number
    multiplier?: number
  }
  updatedAt?: string
}

export type IncidentPoliciesResponse = {
  policies: IncidentPolicy[]
}

export type UpsertIncidentPolicyInput = {
  enabled: boolean
  severity: IncidentSeverity
  openAfter: number
  closeAfter: number
  params: IncidentPolicy["params"]
}

export type IncidentProfileId = "strict" | "recommended" | "calm" | "custom"

export type IncidentProfile = {
  id: Exclude<IncidentProfileId, "custom">
  label: string
  openAfter: number
  closeAfter: number
}
