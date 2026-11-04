"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import {
  acknowledgeIncident,
  getIncident,
  listActiveIncidents,
} from "./api"

export function useActiveIncidents(workflowId: string) {
  return useQuery({
    queryKey: queryKeys.incidents.active(workflowId),
    queryFn: () => listActiveIncidents(workflowId),
    enabled: Boolean(workflowId),
  })
}

export function useIncident(incidentId: string | null) {
  return useQuery({
    queryKey: queryKeys.incidents.detail(incidentId ?? ""),
    queryFn: () => getIncident(incidentId as string),
    enabled: Boolean(incidentId),
  })
}

export function useAcknowledgeIncident(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (incidentId: string) => acknowledgeIncident(incidentId),
    onSuccess: (detail) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.incidents.all(workflowId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.incidents.detail(detail.id),
      })
    },
  })
}
