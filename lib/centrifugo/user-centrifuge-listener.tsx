"use client"

import { useUser } from "@/lib/user/hooks"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef } from "react"
import {
  applyWorkflowStarted,
  refetchStatistics,
  refetchWorkflowDetail,
} from "./stats-cache"
import {
  eventTypeEquals,
  isUserStreamEvent,
  shouldRefreshStats,
  type UserStreamEvent,
} from "./types"
import { useCentrifuge } from "./use-centrifuge"

/** Delay so the stats API has committed the new running run. */
const STARTED_REFETCH_MS = 800

/** Subscribes to `users:{id}` and refreshes stats on run events (1× started, 1× finished). */
export function UserCentrifugeListener() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const startedTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )

  const handlePublication = useCallback(
    (data: unknown) => {
      if (!isUserStreamEvent(data)) return
      if (!shouldRefreshStats(data)) return

      const event = data as UserStreamEvent
      console.log("[Centrifugo] refresh", event.type, event.workflowId)

      if (eventTypeEquals(event, "workflow.started")) {
        applyWorkflowStarted(queryClient, event.workflowId)
        if (startedTimeoutRef.current) clearTimeout(startedTimeoutRef.current)
        startedTimeoutRef.current = setTimeout(() => {
          void refetchStatistics(queryClient)
        }, STARTED_REFETCH_MS)
        return
      }

      // workflow.finished — one stats pull + exact workflow detail (last run).
      if (startedTimeoutRef.current) clearTimeout(startedTimeoutRef.current)
      void refetchStatistics(queryClient)
      if (event.workflowId) {
        void refetchWorkflowDetail(queryClient, event.workflowId)
      }
    },
    [queryClient]
  )

  const onReconnected = useCallback(() => {
    void refetchStatistics(queryClient)
  }, [queryClient])

  useCentrifuge(user?.id ?? null, handlePublication, onReconnected)

  return null
}
