import { parseApiError } from "@/lib/api-error"
import type {
  IncidentDetail,
  IncidentListItem,
  IncidentListResponse,
} from "./types"

export const listActiveIncidents = async (
  workflowId: string,
  limit = 50
): Promise<IncidentListResponse> => {
  const params = new URLSearchParams({
    state: "open,acknowledged",
    limit: String(limit),
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

export const getIncident = async (
  incidentId: string
): Promise<IncidentDetail> => {
  const response = await fetch(`/api/incidents/${incidentId}`, {
    method: "GET",
    cache: "no-store",
  })
  if (!response.ok) {
    throw await parseApiError(response, "Failed to load incident")
  }
  return response.json()
}

export const acknowledgeIncident = async (
  incidentId: string
): Promise<IncidentDetail> => {
  const response = await fetch(`/api/incidents/${incidentId}/acknowledge`, {
    method: "POST",
  })
  if (!response.ok) {
    throw await parseApiError(response, "Failed to acknowledge incident")
  }
  return response.json()
}
