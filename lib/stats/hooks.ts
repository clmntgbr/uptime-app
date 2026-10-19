"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { queryKeys } from "@/lib/query/keys"
import { formatRelativeTime } from "./format"
import { getDashboardStats } from "./api"

export function useDashboardStats(workflowId?: string) {
  return useQuery({
    queryKey: queryKeys.stats.dashboard(workflowId),
    queryFn: () => getDashboardStats(workflowId),
  })
}

/**
 * Live relative time that ticks while the timestamp is unchanged
 * (every 1s under a minute, then every 60s).
 */
export function useRelativeTime(iso: string | undefined | null): string {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!iso) return

    let timeout: ReturnType<typeof setTimeout>
    const schedule = () => {
      const ageMs = Date.now() - new Date(iso).getTime()
      const delay = Number.isNaN(ageMs) || ageMs < 60_000 ? 1_000 : 60_000
      timeout = setTimeout(() => {
        setNow(Date.now())
        schedule()
      }, delay)
    }
    schedule()

    return () => clearTimeout(timeout)
  }, [iso])

  // `now` forces a recompute when the clock ticks.
  void now
  return formatRelativeTime(iso)
}
