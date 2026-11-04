import { parseApiError } from "@/lib/api-error"
import type { IncidentKind } from "@/lib/incident/types"
import type {
  IncidentPoliciesResponse,
  IncidentPolicy,
  UpsertIncidentPolicyInput,
} from "./types"

export const listIncidentPolicies = async (
  workflowId: string
): Promise<IncidentPoliciesResponse> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/incident-policies`,
    { method: "GET", cache: "no-store" }
  )
  if (!response.ok) {
    throw await parseApiError(response, "Failed to load incident policies")
  }
  return response.json()
}

export const upsertIncidentPolicy = async (
  workflowId: string,
  kind: IncidentKind,
  input: UpsertIncidentPolicyInput
): Promise<IncidentPolicy> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/incident-policies/${kind}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
  if (!response.ok) {
    throw await parseApiError(response, "Failed to save incident policy")
  }
  return response.json()
}
