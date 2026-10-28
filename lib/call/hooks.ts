"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError, formatApiErrorToast } from "@/lib/api-error"
import { queryKeys } from "@/lib/query/keys"
import { toast } from "sonner"
import {
  copyCall,
  createCall,
  deleteCall,
  getCall,
  listCalls,
  reorderCalls,
  updateCall,
} from "./api"
import type { Call, CallInput } from "./types"

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

export function useCopyCall(workflowId: string) {
  const invalidate = useInvalidateCalls(workflowId)

  return useMutation({
    mutationFn: (callId: string) => copyCall(workflowId, callId),
    onSuccess: invalidate,
  })
}

/** Optimistic DnD reorder. Server response has no recentRuns — merge positions in. */
export function useReorderCalls(workflowId: string) {
  const queryClient = useQueryClient()
  const listKey = queryKeys.calls.list(workflowId)

  return useMutation({
    mutationFn: (callIds: string[]) => reorderCalls(workflowId, callIds),
    onMutate: async (callIds) => {
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<Call[]>(listKey)
      if (previous) {
        const byId = new Map(previous.map((call) => [call.id, call]))
        queryClient.setQueryData<Call[]>(
          listKey,
          callIds.flatMap((id, index) => {
            const call = byId.get(id)
            return call ? [{ ...call, position: index + 1 }] : []
          })
        )
      }
      return { previous }
    },
    onError: (error, _callIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous)
      }
      if (error instanceof ApiError) {
        const { title, description } = formatApiErrorToast(error)
        toast.error(title, { description })
        return
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to reorder calls"
      )
    },
    onSuccess: (calls) => {
      queryClient.setQueryData<Call[]>(listKey, (old) => {
        if (!old) return calls
        const byId = new Map(old.map((call) => [call.id, call]))
        return calls.map((call) => {
          const previous = byId.get(call.id)
          return previous
            ? { ...previous, ...call, recentRuns: previous.recentRuns }
            : call
        })
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.availableVariables.all,
      })
    },
  })
}
