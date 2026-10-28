import { parseApiError } from "@/lib/api-error"
import { Call, CallDetail, CallInput } from "./types"

export const listCalls = async (workflowId: string): Promise<Call[]> => {
  const response = await fetch(`/api/workflows/${workflowId}/calls`, {
    method: "GET",
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to list calls")
  }

  return response.json()
}

export const getCall = async (
  workflowId: string,
  callId: string
): Promise<CallDetail> => {
  const response = await fetch(`/api/workflows/${workflowId}/calls/${callId}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to get call")
  }

  return response.json()
}

export const createCall = async (
  workflowId: string,
  input: CallInput
): Promise<Call> => {
  const response = await fetch(`/api/workflows/${workflowId}/calls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to create call")
  }

  return response.json()
}

export const updateCall = async (
  workflowId: string,
  callId: string,
  input: CallInput
): Promise<Call> => {
  const response = await fetch(`/api/workflows/${workflowId}/calls/${callId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to update call")
  }

  return response.json()
}

export const deleteCall = async (
  workflowId: string,
  callId: string
): Promise<void> => {
  const response = await fetch(`/api/workflows/${workflowId}/calls/${callId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to delete call")
  }
}

/** POST /api/workflows/:id/calls/:callId/copy → 201 */
export const copyCall = async (
  workflowId: string,
  callId: string
): Promise<Call> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/calls/${callId}/copy`,
    { method: "POST" }
  )

  if (!response.ok) {
    throw await parseApiError(response, "Failed to copy call")
  }

  return response.json()
}

/** PUT /api/workflows/:id/calls/reorder — callIds must be an exact permutation. */
export const reorderCalls = async (
  workflowId: string,
  callIds: string[]
): Promise<Call[]> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/calls/reorder`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callIds }),
    }
  )

  if (!response.ok) {
    throw await parseApiError(response, "Failed to reorder calls")
  }

  return response.json()
}
