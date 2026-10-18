import { parseApiError } from "@/lib/api-error"
import { DashboardStats } from "./types"

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await fetch("/api/stats", { method: "GET" })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to load stats")
  }

  return response.json()
}
