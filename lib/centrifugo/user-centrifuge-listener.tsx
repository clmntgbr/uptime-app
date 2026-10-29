"use client"

import { useUser } from "@/lib/user/hooks"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef } from "react"
import {
  applyWorkflowStarted,
  refetchAllWorkflowContext,
  refetchAllWorkflowExpiry,
  refetchStatistics,
  refetchWorkflowContext,
  refetchWorkflowDetail,
  refetchWorkflowExpiry,
  refetchWorkflowRuns,
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

      const event = data as UserStreamEvent
      console.log("[Centrifugo] refresh", event.type, event.workflowId)

      if (eventTypeEquals(event, "expiry.alerted")) {
        if (event.workflowId) {
          refetchWorkflowExpiry(queryClient, event.workflowId, "items")
        }
        return
      }

      if (eventTypeEquals(event, "workflow.updated")) {
        if (event.workflowId) {
          refetchWorkflowExpiry(queryClient, event.workflowId, "all")
          void refetchWorkflowDetail(queryClient, event.workflowId)
        }
        return
      }

      if (!shouldRefreshStats(event)) return

      if (eventTypeEquals(event, "workflow.started")) {
        applyWorkflowStarted(queryClient, event.workflowId)
        if (event.workflowId) {
          void refetchWorkflowDetail(queryClient, event.workflowId)
        }
        if (startedTimeoutRef.current) clearTimeout(startedTimeoutRef.current)
        startedTimeoutRef.current = setTimeout(() => {
          void refetchStatistics(queryClient)
          if (event.workflowId) {
            void refetchWorkflowRuns(queryClient, event.workflowId)
          }
        }, STARTED_REFETCH_MS)
        return
      }

      // workflow.finished — stats + runs + context + expiry items.
      if (startedTimeoutRef.current) clearTimeout(startedTimeoutRef.current)
      void refetchStatistics(queryClient)
      if (event.workflowId) {
        void refetchWorkflowDetail(queryClient, event.workflowId)
        void refetchWorkflowRuns(queryClient, event.workflowId)
        refetchWorkflowContext(queryClient, event.workflowId)
        refetchWorkflowExpiry(queryClient, event.workflowId, "items")
      }
    },
    [queryClient]
  )

  const onReconnected = useCallback(() => {
    void refetchStatistics(queryClient)
    void refetchAllWorkflowContext(queryClient)
    void refetchAllWorkflowExpiry(queryClient)
    void queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "runs" && query.queryKey[2] === "list",
    })
  }, [queryClient])

  useCentrifuge(user?.id ?? null, handlePublication, onReconnected)

  return null
}
