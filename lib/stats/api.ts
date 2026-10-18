import { parseApiError } from "@/lib/api-error"
import { DashboardStats } from "./types"

export const getDashboardStats = async (
  workflowId?: string
): Promise<DashboardStats> => {
  const params = new URLSearchParams()
  if (workflowId) params.set("workflowId", workflowId)
  const query = params.toString()

  const response = await fetch(
    `/api/statistics${query ? `?${query}` : ""}`,
    { method: "GET" }
  )

  if (!response.ok) {
    throw await parseApiError(response, "Failed to load statistics")
  }

  return response.json()
}
