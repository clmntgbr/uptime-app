"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import { getDashboardStats } from "./api"

export function useDashboardStats(workflowId?: string) {
  return useQuery({
    queryKey: queryKeys.stats.dashboard(workflowId),
    queryFn: () => getDashboardStats(workflowId),
  })
}
