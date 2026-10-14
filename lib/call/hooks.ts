"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import { createCall, deleteCall, getCall, listCalls, updateCall } from "./api"
import { CallInput } from "./types"

export function useCalls(workflowId: string) {
  return useQuery({
    queryKey: queryKeys.calls.list(workflowId),
    queryFn: () => listCalls(workflowId),
  })
}

export function useCall(workflowId: string, callId: string | null) {
  return useQuery({
    queryKey: queryKeys.calls.detail(workflowId, callId ?? ""),
    queryFn: () => getCall(workflowId, callId as string),
    enabled: !!callId,
  })
}

/** Call keys are nested under the workflow detail key, which a call change also updates. */
function useInvalidateCalls(workflowId: string) {
  const queryClient = useQueryClient()

  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.workflows.detail(workflowId),
    })
}

export function useCreateCall(workflowId: string) {
  const invalidate = useInvalidateCalls(workflowId)

  return useMutation({
    mutationFn: (input: CallInput) => createCall(workflowId, input),
    onSuccess: invalidate,
  })
}

export function useUpdateCall(workflowId: string) {
  const invalidate = useInvalidateCalls(workflowId)

  return useMutation({
    mutationFn: ({ callId, input }: { callId: string; input: CallInput }) =>
      updateCall(workflowId, callId, input),
    onSuccess: invalidate,
  })
}

export function useDeleteCall(workflowId: string) {
  const invalidate = useInvalidateCalls(workflowId)

  return useMutation({
    mutationFn: (callId: string) => deleteCall(workflowId, callId),
    onSuccess: invalidate,
  })
}
