import { parseApiError } from "@/lib/api-error"
import type {
  ContextLatestRunResponse,
  ContextVariablesResponse,
} from "./types"

export const getContextLatestRun = async (
  workflowId: string
): Promise<ContextLatestRunResponse> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/context/runs/latest`,
    { method: "GET", cache: "no-store" }
  )

  if (!response.ok) {
    throw await parseApiError(response, "Failed to load latest run")
  }

  return response.json()
}

export const getContextVariables = async (
  workflowId: string
): Promise<ContextVariablesResponse> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/context/variables`,
    { method: "GET", cache: "no-store" }
  )

  if (!response.ok) {
    throw await parseApiError(response, "Failed to load variables")
  }

  return response.json()
}
