import { parseApiError } from "@/lib/api-error"

export type CallSuggestionKind =
  | "header-keys"
  | "header-values"
  | "query-keys"
  | "query-values"

export const searchCallSuggestions = async (
  workflowId: string,
  kind: CallSuggestionKind,
  q = "",
  limit = 20
): Promise<string[]> => {
  const params = new URLSearchParams()
  if (q.trim()) params.set("q", q.trim())
  if (limit > 0) params.set("limit", String(limit))
  const qs = params.toString()
  const response = await fetch(
    `/api/workflows/${workflowId}/suggestions/${kind}${qs ? `?${qs}` : ""}`,
    { method: "GET", cache: "no-store" }
  )
  if (!response.ok) {
    throw await parseApiError(response, "Failed to load suggestions")
  }
  return response.json()
}
