"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { IncidentKind } from "@/lib/incident/types"
import { queryKeys } from "@/lib/query/keys"
import { listIncidentPolicies, upsertIncidentPolicy } from "./api"
import type { UpsertIncidentPolicyInput } from "./types"

export function useIncidentPolicies(workflowId: string) {
  return useQuery({
    queryKey: queryKeys.incidentPolicies.list(workflowId),
    queryFn: () => listIncidentPolicies(workflowId),
  })
}

export function useUpsertIncidentPolicy(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      kind,
      input,
    }: {
      kind: IncidentKind
      input: UpsertIncidentPolicyInput
    }) => upsertIncidentPolicy(workflowId, kind, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.incidentPolicies.list(workflowId),
      })
    },
  })
}
