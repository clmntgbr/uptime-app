"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import { acknowledgeIncident, listActiveIncidents } from "./api"

export function useActiveIncidents(workflowId: string) {
  return useQuery({
    queryKey: queryKeys.incidents.active(workflowId),
    queryFn: () => listActiveIncidents(workflowId),
    enabled: Boolean(workflowId),
  })
}

export function useAcknowledgeIncident(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (incidentId: string) => acknowledgeIncident(incidentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.incidents.all(workflowId),
      })
    },
  })
}
