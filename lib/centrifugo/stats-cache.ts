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

/** List only — do not invalidate run detail (would refetch an open/cached drawer). */
export function refetchWorkflowRuns(
  queryClient: QueryClient,
  workflowId: string
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.runs.lists(workflowId),
  })
}

const CONTEXT_DEBOUNCE_MS = 500
const contextTimers = new Map<string, ReturnType<typeof setTimeout>>()

/** Debounced refresh of the workflow context column (latest run + variables). */
export function refetchWorkflowContext(
  queryClient: QueryClient,
  workflowId: string
) {
  const existing = contextTimers.get(workflowId)
  if (existing) clearTimeout(existing)
  contextTimers.set(
    workflowId,
    setTimeout(() => {
      contextTimers.delete(workflowId)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.context.all(workflowId),
      })
    }, CONTEXT_DEBOUNCE_MS)
  )
}

/** Immediate context refresh for every open workflow (e.g. reconnect). */
export function refetchAllWorkflowContext(queryClient: QueryClient) {
  for (const timer of contextTimers.values()) clearTimeout(timer)
  contextTimers.clear()
  return queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === "workflows" &&
      query.queryKey[2] === "context",
  })
}
