import { parseApiError } from "@/lib/api-error"
import { buildQueryString, Paginate, PaginateParams } from "@/lib/paginate"
import type { RunDetail, RunListItem } from "./types"

export const listRuns = async (
  workflowId: string,
  params?: PaginateParams
): Promise<Paginate<RunListItem>> => {
  const response = await fetch(
    `/api/workflows/${encodeURIComponent(workflowId)}/runs${buildQueryString(params)}`,
    { method: "GET" }
  )

  if (!response.ok) {
    throw await parseApiError(response, "Failed to list runs")
  }

  return response.json()
}

export const getRun = async (
  workflowId: string,
  runId: string
): Promise<RunDetail> => {
  const response = await fetch(
    `/api/workflows/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}`,
    { method: "GET" }
  )

  if (!response.ok) {
    throw await parseApiError(response, "Failed to get run")
  }

  return response.json()
}
