"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import { getDashboardStats } from "./api"

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.stats.dashboard,
    queryFn: getDashboardStats,
  })
}
