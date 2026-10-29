"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import {
  listExpiryItems,
  listExpiryPolicies,
  upsertExpiryPolicy,
} from "./api"
import type { ExpiryType, UpsertExpiryPolicyInput } from "./types"

export function useExpiryPolicies(workflowId: string) {
  return useQuery({
    queryKey: queryKeys.expiry.policies(workflowId),
    queryFn: () => listExpiryPolicies(workflowId),
  })
}

export function useExpiryItems(workflowId: string, type: ExpiryType) {
  return useQuery({
    queryKey: queryKeys.expiry.items(workflowId, type),
    queryFn: () => listExpiryItems(workflowId, type),
  })
}

export function useUpsertExpiryPolicy(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      type,
      input,
    }: {
      type: ExpiryType
      input: UpsertExpiryPolicyInput
    }) => upsertExpiryPolicy(workflowId, type, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expiry.policies(workflowId),
      })
    },
  })
}
