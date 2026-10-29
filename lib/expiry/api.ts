import { parseApiError } from "@/lib/api-error"
import type {
  ExpiryItemsResponse,
  ExpiryPoliciesResponse,
  ExpiryPolicy,
  ExpiryType,
  UpsertExpiryPolicyInput,
} from "./types"

export const listExpiryPolicies = async (
  workflowId: string
): Promise<ExpiryPoliciesResponse> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/expiry-policies`,
    { method: "GET", cache: "no-store" }
  )
  if (!response.ok) {
    throw await parseApiError(response, "Failed to load expiry policies")
  }
  return response.json()
}

export const upsertExpiryPolicy = async (
  workflowId: string,
  type: ExpiryType,
  input: UpsertExpiryPolicyInput
): Promise<ExpiryPolicy> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/expiry-policies/${type}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
  if (!response.ok) {
    throw await parseApiError(response, "Failed to save expiry policy")
  }
  return response.json()
}

export const listExpiryItems = async (
  workflowId: string,
  type: ExpiryType
): Promise<ExpiryItemsResponse> => {
  const params = new URLSearchParams({ type })
  const response = await fetch(
    `/api/workflows/${workflowId}/expiry-items?${params}`,
    { method: "GET", cache: "no-store" }
  )
  if (!response.ok) {
    throw await parseApiError(response, "Failed to load expiry items")
  }
  return response.json()
}
