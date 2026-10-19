import { queryKeys } from "@/lib/query/keys"
import type { DashboardStats } from "@/lib/stats/types"
import type { Workflow } from "@/lib/workflow/types"
import type { QueryClient } from "@tanstack/react-query"

/** Bump running counters so the UI reacts before the stats API catches up. */
export function applyWorkflowStarted(
  queryClient: QueryClient,
  workflowId: string | undefined
) {
  const keys = [queryKeys.stats.dashboard()]
  if (workflowId) keys.push(queryKeys.stats.dashboard(workflowId))

  for (const queryKey of keys) {
    queryClient.setQueryData<DashboardStats>(queryKey, (old) => {
      if (!old) return old
      // Idempotent: Run click + workflow.started must not double-count.
      if (old.runs.running > 0) return old
      return {
        ...old,
        runs: {
          ...old.runs,
          running: 1,
          total: old.runs.total + 1,
        },
      }
    })
  }

  if (workflowId) {
    queryClient.setQueryData<Workflow>(
      queryKeys.workflows.detail(workflowId),
      (old) => (old ? { ...old, isRunning: true } : old)
    )
  }
}

/** Clear running so Stop → Run switches immediately. */
export function applyWorkflowStopped(
  queryClient: QueryClient,
  workflowId: string | undefined
) {
  const keys = [queryKeys.stats.dashboard()]
  if (workflowId) keys.push(queryKeys.stats.dashboard(workflowId))

  for (const queryKey of keys) {
    queryClient.setQueryData<DashboardStats>(queryKey, (old) => {
      if (!old || old.runs.running <= 0) return old
      return {
        ...old,
        runs: {
          ...old.runs,
          running: 0,
        },
      }
    })
  }

  if (workflowId) {
    queryClient.setQueryData<Workflow>(
      queryKeys.workflows.detail(workflowId),
      (old) => (old ? { ...old, isRunning: false } : old)
    )
  }
}

/**
 * Refetch statistics once. Does not touch workflow detail (that would cascade
 * into calls / variables because their keys are nested under it).
 */
export function refetchStatistics(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
}

/** Refresh lastRunAt / lastStatus only — exact match, no calls/variables. */
export function refetchWorkflowDetail(
  queryClient: QueryClient,
  workflowId: string
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.workflows.detail(workflowId),
    exact: true,
  })
}
