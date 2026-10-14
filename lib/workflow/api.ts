import { parseApiError } from "@/lib/api-error"
import { buildQueryString, Paginate, PaginateParams } from "@/lib/paginate"
import {
  Workflow,
  WorkflowIdResponse,
  WorkflowInput,
  WorkflowListItem,
  WorkflowRunResponse,
} from "./types"

export const listWorkflows = async (
  params?: PaginateParams
): Promise<Paginate<WorkflowListItem>> => {
  const response = await fetch(`/api/workflows${buildQueryString(params)}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to list workflows")
  }

  return response.json()
}

export const getWorkflow = async (id: string): Promise<Workflow> => {
  const response = await fetch(`/api/workflows/${id}`, { method: "GET" })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to get workflow")
  }

  return response.json()
}

export const createWorkflow = async (
  input: WorkflowInput
): Promise<WorkflowIdResponse> => {
  const response = await fetch("/api/workflows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to create workflow")
  }

  return response.json()
}

export const updateWorkflow = async (
  id: string,
  input: WorkflowInput
): Promise<WorkflowIdResponse> => {
  const response = await fetch(`/api/workflows/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to update workflow")
  }

  return response.json()
}

export const runWorkflow = async (id: string): Promise<WorkflowRunResponse> => {
  const response = await fetch(`/api/workflows/${id}/runs`, { method: "POST" })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to run workflow")
  }

  return response.json()
}

export const deleteWorkflow = async (id: string): Promise<void> => {
  const response = await fetch(`/api/workflows/${id}`, { method: "DELETE" })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to delete workflow")
  }
}
