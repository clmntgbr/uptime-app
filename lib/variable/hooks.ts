"use client"

import {
  QueryKey,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { listCalls } from "@/lib/call/api"
import { queryKeys } from "@/lib/query/keys"
import {
  createCallVariable,
  createGlobalVariable,
  createStaticVariable,
  deleteCallVariable,
  deleteGlobalVariable,
  deleteStaticVariable,
  getCallVariable,
  getGlobalVariable,
  getStaticVariable,
  listAvailableVariables,
  listCallVariables,
  listGlobalVariables,
  listResponseKeys,
  listStaticVariables,
  updateCallVariable,
  updateGlobalVariable,
  updateStaticVariable,
} from "./api"
import {
  AvailableVariable,
  CallVariableCreateInput,
  CallVariableUpdateInput,
  GlobalVariableCreateInput,
  GlobalVariableUpdateInput,
  StaticVariableCreateInput,
  StaticVariableUpdateInput,
} from "./types"

function useInvalidate(queryKey: QueryKey) {
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.availableVariables.all,
      }),
    ])
}

export function useGlobalVariables() {
  return useQuery({
    queryKey: queryKeys.globalVariables.list(),
    queryFn: listGlobalVariables,
  })
}

export function useGlobalVariable(id: string | null) {
  return useQuery({
    queryKey: queryKeys.globalVariables.detail(id ?? ""),
    queryFn: () => getGlobalVariable(id as string),
    enabled: !!id,
  })
}

export function useCreateGlobalVariable() {
  const invalidate = useInvalidate(queryKeys.globalVariables.all)

  return useMutation({
    mutationFn: (input: GlobalVariableCreateInput) =>
      createGlobalVariable(input),
    onSuccess: invalidate,
  })
}

export function useUpdateGlobalVariable() {
  const invalidate = useInvalidate(queryKeys.globalVariables.all)

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: GlobalVariableUpdateInput
    }) => updateGlobalVariable(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteGlobalVariable() {
  const invalidate = useInvalidate(queryKeys.globalVariables.all)

  return useMutation({
    mutationFn: (id: string) => deleteGlobalVariable(id),
    onSuccess: invalidate,
  })
}

export function useStaticVariables(workflowId: string) {
  return useQuery({
    queryKey: queryKeys.staticVariables.list(workflowId),
    queryFn: () => listStaticVariables(workflowId),
  })
}

export function useStaticVariable(workflowId: string, name: string | null) {
  return useQuery({
    queryKey: queryKeys.staticVariables.detail(workflowId, name ?? ""),
    queryFn: () => getStaticVariable(workflowId, name as string),
    enabled: !!name,
  })
}

export function useCreateStaticVariable(workflowId: string) {
  const invalidate = useInvalidate(queryKeys.staticVariables.all(workflowId))

  return useMutation({
    mutationFn: (input: StaticVariableCreateInput) =>
      createStaticVariable(workflowId, input),
    onSuccess: invalidate,
  })
}

export function useUpdateStaticVariable(workflowId: string) {
  const invalidate = useInvalidate(queryKeys.staticVariables.all(workflowId))

  return useMutation({
    mutationFn: ({
      name,
      input,
    }: {
      name: string
      input: StaticVariableUpdateInput
    }) => updateStaticVariable(workflowId, name, input),
    onSuccess: invalidate,
  })
}

export function useDeleteStaticVariable(workflowId: string) {
  const invalidate = useInvalidate(queryKeys.staticVariables.all(workflowId))

  return useMutation({
    mutationFn: (name: string) => deleteStaticVariable(workflowId, name),
    onSuccess: invalidate,
  })
}

export function useCallVariables(workflowId: string, callId: string) {
  return useQuery({
    queryKey: queryKeys.callVariables.list(workflowId, callId),
    queryFn: () => listCallVariables(workflowId, callId),
  })
}

export function useCallVariable(
  workflowId: string,
  callId: string,
  name: string | null
) {
  return useQuery({
    queryKey: queryKeys.callVariables.detail(workflowId, callId, name ?? ""),
    queryFn: () => getCallVariable(workflowId, callId, name as string),
    enabled: !!name,
  })
}

export function useCreateCallVariable(workflowId: string, callId: string) {
  const invalidate = useInvalidate(
    queryKeys.callVariables.all(workflowId, callId)
  )

  return useMutation({
    mutationFn: (input: CallVariableCreateInput) =>
      createCallVariable(workflowId, callId, input),
    onSuccess: invalidate,
  })
}

export function useUpdateCallVariable(workflowId: string, callId: string) {
  const invalidate = useInvalidate(
    queryKeys.callVariables.all(workflowId, callId)
  )

  return useMutation({
    mutationFn: ({
      name,
      input,
    }: {
      name: string
      input: CallVariableUpdateInput
    }) => updateCallVariable(workflowId, callId, name, input),
    onSuccess: invalidate,
  })
}

export function useDeleteCallVariable(workflowId: string, callId: string) {
  const invalidate = useInvalidate(
    queryKeys.callVariables.all(workflowId, callId)
  )

  return useMutation({
    mutationFn: (name: string) => deleteCallVariable(workflowId, callId, name),
    onSuccess: invalidate,
  })
}

export function useAvailableVariables(
  workflowId: string,
  callId: string,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.availableVariables.list(workflowId, callId),
    queryFn: () => listAvailableVariables(workflowId, callId),
    enabled: enabled && !!callId,
  })
}

/**
 * Variables usable in a call form:
 * - edit: backend `available-variables` (globals + statics + previous calls)
 * - create: same composition client-side (new call is appended last)
 */
export function useCallFormVariables(
  workflowId: string,
  callId: string | null
) {
  const availableQuery = useAvailableVariables(
    workflowId,
    callId ?? "",
    !!callId
  )
  const globalsQuery = useGlobalVariables()
  const staticsQuery = useStaticVariables(workflowId)
  const callsQuery = useQuery({
    queryKey: queryKeys.calls.list(workflowId),
    queryFn: () => listCalls(workflowId),
    enabled: !callId,
  })

  const previousCalls = callId ? [] : (callsQuery.data ?? [])

  const previousCallVariableQueries = useQueries({
    queries: previousCalls.map((call) => ({
      queryKey: queryKeys.callVariables.list(workflowId, call.id),
      queryFn: () => listCallVariables(workflowId, call.id),
      enabled: !callId,
    })),
  })

  if (callId) {
    return availableQuery.data ?? []
  }

  const variables: AvailableVariable[] = [
    ...(globalsQuery.data ?? []).map((variable) => ({
      name: variable.name,
      type: "global" as const,
      value: variable.value,
      secret: variable.secret,
    })),
    ...(staticsQuery.data ?? []),
  ]

  previousCalls.forEach((call, index) => {
    for (const variable of previousCallVariableQueries[index]?.data ?? []) {
      variables.push({
        ...variable,
        callId: call.id,
        callName: call.name,
      })
    }
  })

  return variables
}

export function useResponseKeys(
  workflowId: string,
  callId: string,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.responseKeys.list(workflowId, callId),
    queryFn: () => listResponseKeys(workflowId, callId),
    enabled,
  })
}
