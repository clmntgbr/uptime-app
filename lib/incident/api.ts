import { parseApiError } from "@/lib/api-error"
import type { IncidentListItem, IncidentListResponse } from "./types"

export const listActiveIncidents = async (
  workflowId: string
): Promise<IncidentListResponse> => {
  const params = new URLSearchParams({
    state: "open,acknowledged",
    limit: "20",
  })
  const response = await fetch(
    `/api/workflows/${workflowId}/incidents?${params}`,
    { method: "GET", cache: "no-store" }
  )
  if (!response.ok) {
    throw await parseApiError(response, "Failed to load incidents")
  }
  return response.json()
}

export const acknowledgeIncident = async (
  incidentId: string
): Promise<IncidentListItem> => {
  const response = await fetch(`/api/incidents/${incidentId}/acknowledge`, {
    method: "POST",
  })
  if (!response.ok) {
    throw await parseApiError(response, "Failed to acknowledge incident")
  }
  return response.json()
}
