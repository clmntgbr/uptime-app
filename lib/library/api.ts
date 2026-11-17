import { parseApiError } from "@/lib/api-error"
import {
  buildQueryString,
  type Paginate,
  type PaginateParams,
} from "@/lib/paginate"
import type { Call } from "@/lib/call/types"
import type {
  LibraryImportFormat,
  LibraryImportPreview,
  LibraryItem,
  LibraryItemInput,
  LibraryItemSummary,
} from "./types"

export interface LibraryListParams extends PaginateParams {
  /** Keep only items with one of these methods. Empty means all. */
  methods?: string[]
}

export const listLibraryItems = async (
  params?: LibraryListParams
): Promise<Paginate<LibraryItemSummary>> => {
  const query = new URLSearchParams(buildQueryString(params).replace(/^\?/, ""))
  for (const method of params?.methods ?? []) {
    query.append("method", method)
  }
  const suffix = query.toString() ? `?${query.toString()}` : ""
  const response = await fetch(`/api/library${suffix}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to list library")
  }

  return response.json()
}

export const getLibraryItem = async (id: string): Promise<LibraryItem> => {
  const response = await fetch(`/api/library/${id}`, { method: "GET" })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to get library item")
  }

  return response.json()
}

export const createLibraryItem = async (
  input: LibraryItemInput
): Promise<LibraryItem> => {
  const response = await fetch(`/api/library`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to create library item")
  }

  return response.json()
}

export const updateLibraryItem = async (
  id: string,
  input: LibraryItemInput
): Promise<LibraryItem> => {
  const response = await fetch(`/api/library/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to update library item")
  }

  return response.json()
}

export const deleteLibraryItem = async (id: string): Promise<void> => {
  const response = await fetch(`/api/library/${id}`, { method: "DELETE" })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to delete library item")
  }
}

/** POST /api/workflows/:id/calls/from-library/:itemId → 201, appended unless position is set. */
export const insertLibraryItem = async (
  workflowId: string,
  itemId: string
): Promise<Call> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/calls/from-library/${itemId}`,
    { method: "POST" }
  )

  if (!response.ok) {
    throw await parseApiError(response, "Failed to add library item")
  }

  return response.json()
}

export const previewLibraryImport = async (input: {
  format: LibraryImportFormat
  content: string
  baseUrl?: string
}): Promise<LibraryImportPreview> => {
  const response = await fetch(`/api/library/import/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to preview import")
  }

  return response.json()
}

/** Creates every confirmed candidate in one transaction on the server. */
export const confirmLibraryImport = async (
  items: { key: string; payload: LibraryItemInput }[]
): Promise<LibraryItem[]> => {
  const response = await fetch(`/api/library/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to import library items")
  }

  return response.json()
}
