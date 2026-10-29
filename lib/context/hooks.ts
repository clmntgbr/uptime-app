"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import { getContextLatestRun, getContextVariables } from "./api"

export function useContextLatestRun(workflowId: string) {
  return useQuery({
    queryKey: queryKeys.context.latestRun(workflowId),
    queryFn: () => getContextLatestRun(workflowId),
  })
}

export function useContextVariables(workflowId: string) {
  return useQuery({
    queryKey: queryKeys.context.variables(workflowId),
    queryFn: () => getContextVariables(workflowId),
  })
}
