import { parseApiError } from "@/lib/api-error"
import type { FeedListResponse } from "./types"

export type ListFeedParams = {
  workflowId?: string
  cursor?: string
  limit?: number
  kind?: string
  severity?: string
}

export const listFeed = async (
  params: ListFeedParams = {}
): Promise<FeedListResponse> => {
  const query = new URLSearchParams()
  if (params.workflowId) query.set("workflowId", params.workflowId)
  if (params.cursor) query.set("cursor", params.cursor)
  if (params.limit != null) query.set("limit", String(params.limit))
  if (params.kind) query.set("kind", params.kind)
  if (params.severity) query.set("severity", params.severity)
  const suffix = query.toString() ? `?${query.toString()}` : ""
  const response = await fetch(`/api/feed${suffix}`, {
    method: "GET",
    cache: "no-store",
  })
  if (!response.ok) {
    throw await parseApiError(response, "Failed to load feed")
  }
  return response.json()
}
