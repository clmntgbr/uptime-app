"use client"

import { queryKeys } from "@/lib/query/keys"
import { useUser } from "@/lib/user/hooks"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef } from "react"
import { isUserStreamEvent, shouldRefreshStats } from "./types"
import { useCentrifuge } from "./use-centrifuge"

const STATS_DEBOUNCE_MS = 500

/** Subscribes to `users:{id}` and refreshes dashboard stats on run events. */
export function UserCentrifugeListener() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )

  const refreshStats = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stats.dashboard,
      })
    }, STATS_DEBOUNCE_MS)
  }, [queryClient])

  const handlePublication = useCallback(
    (data: unknown) => {
      if (!isUserStreamEvent(data)) return
      if (!shouldRefreshStats(data)) return
      refreshStats()
    },
    [refreshStats]
  )

  useCentrifuge(user?.id ?? null, handlePublication, refreshStats)

  return null
}
