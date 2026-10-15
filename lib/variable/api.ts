import { parseApiError } from "@/lib/api-error"
import {
  AvailableVariable,
  CallVariable,
  CallVariableCreateInput,
  CallVariableUpdateInput,
  GlobalVariable,
  GlobalVariableCreateInput,
  GlobalVariableUpdateInput,
  StaticVariable,
  StaticVariableCreateInput,
  StaticVariableUpdateInput,
  toCallVariableBody,
} from "./types"

async function request<T>(
  url: string,
  fallbackMessage: string,
  init?: { method: "POST" | "PUT" | "DELETE"; body?: unknown }
): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers:
      init?.body !== undefined
        ? { "Content-Type": "application/json" }
        : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })

  if (!response.ok) {
    throw await parseApiError(response, fallbackMessage)
  }

  return (response.status === 204 ? undefined : await response.json()) as T
}

const staticsUrl = (workflowId: string) =>
  `/api/workflows/${workflowId}/variables`

const callVariablesUrl = (workflowId: string, callId: string) =>
  `/api/workflows/${workflowId}/calls/${callId}/variables`

export const listGlobalVariables = () =>
  request<GlobalVariable[]>("/api/variables", "Failed to list variables")

export const getGlobalVariable = (id: string) =>
  request<GlobalVariable>(`/api/variables/${id}`, "Failed to get variable")

export const createGlobalVariable = (input: GlobalVariableCreateInput) =>
  request<GlobalVariable>("/api/variables", "Failed to create variable", {
    method: "POST",
    body: input,
  })

export const updateGlobalVariable = (
  id: string,
  input: GlobalVariableUpdateInput
) =>
  request<GlobalVariable>(`/api/variables/${id}`, "Failed to update variable", {
    method: "PUT",
    body: input,
  })

export const deleteGlobalVariable = (id: string) =>
  request<void>(`/api/variables/${id}`, "Failed to delete variable", {
    method: "DELETE",
  })

export const listStaticVariables = (workflowId: string) =>
  request<StaticVariable[]>(staticsUrl(workflowId), "Failed to list variables")

export const getStaticVariable = (workflowId: string, name: string) =>
  request<StaticVariable>(
    `${staticsUrl(workflowId)}/${encodeURIComponent(name)}`,
    "Failed to get variable"
  )

export const createStaticVariable = (
  workflowId: string,
  input: StaticVariableCreateInput
) =>
  request<StaticVariable>(staticsUrl(workflowId), "Failed to create variable", {
    method: "POST",
    body: input,
  })

export const updateStaticVariable = (
  workflowId: string,
  name: string,
  input: StaticVariableUpdateInput
) =>
  request<StaticVariable>(
    `${staticsUrl(workflowId)}/${encodeURIComponent(name)}`,
    "Failed to update variable",
    { method: "PUT", body: input }
  )

export const deleteStaticVariable = (workflowId: string, name: string) =>
  request<void>(
    `${staticsUrl(workflowId)}/${encodeURIComponent(name)}`,
    "Failed to delete variable",
    { method: "DELETE" }
  )

export const listCallVariables = (workflowId: string, callId: string) =>
  request<CallVariable[]>(
    callVariablesUrl(workflowId, callId),
    "Failed to list variables"
  )

export const getCallVariable = (
  workflowId: string,
  callId: string,
  name: string
) =>
  request<CallVariable>(
    `${callVariablesUrl(workflowId, callId)}/${encodeURIComponent(name)}`,
    "Failed to get variable"
  )

/** POST /api/workflows/:id/calls/:callId/variables → 201 */
export const createCallVariable = (
  workflowId: string,
  callId: string,
  input: CallVariableCreateInput
) =>
  request<CallVariable>(
    callVariablesUrl(workflowId, callId),
    "Failed to create variable",
    { method: "POST", body: toCallVariableBody(input) }
  )

/** PUT /api/workflows/:id/calls/:callId/variables/:name → 200 */
export const updateCallVariable = (
  workflowId: string,
  callId: string,
  name: string,
  input: CallVariableUpdateInput
) =>
  request<CallVariable>(
    `${callVariablesUrl(workflowId, callId)}/${encodeURIComponent(name)}`,
    "Failed to update variable",
    { method: "PUT", body: toCallVariableBody(input) }
  )

export const deleteCallVariable = (
  workflowId: string,
  callId: string,
  name: string
) =>
  request<void>(
    `${callVariablesUrl(workflowId, callId)}/${encodeURIComponent(name)}`,
    "Failed to delete variable",
    { method: "DELETE" }
  )

export const listAvailableVariables = (workflowId: string, callId: string) =>
  request<AvailableVariable[]>(
    `/api/workflows/${workflowId}/calls/${callId}/available-variables`,
    "Failed to list available variables"
  )

/** JSON paths from the latest run of this call, for path autocomplete. */
export const listResponseKeys = (workflowId: string, callId: string) =>
  request<string[]>(
    `/api/workflows/${workflowId}/calls/${callId}/response-keys`,
    "Failed to list response keys"
  )
