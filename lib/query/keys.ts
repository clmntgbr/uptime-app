import { PaginateParams } from "@/lib/paginate"

export const queryKeys = {
  user: {
    all: ["user"] as const,
    me: ["user", "me"] as const,
  },

  stats: {
    all: ["statistics"] as const,
    dashboard: (workflowId?: string) =>
      [...queryKeys.stats.all, "dashboard", workflowId ?? "all"] as const,
  },

  workflows: {
    all: ["workflows"] as const,
    lists: () => [...queryKeys.workflows.all, "list"] as const,
    list: (params?: PaginateParams) =>
      [...queryKeys.workflows.lists(), params ?? {}] as const,
    detail: (id: string) => [...queryKeys.workflows.all, id] as const,
  },

  calls: {
    all: (workflowId: string) =>
      [...queryKeys.workflows.detail(workflowId), "calls"] as const,
    list: (workflowId: string) =>
      [...queryKeys.calls.all(workflowId), "list"] as const,
    detail: (workflowId: string, callId: string) =>
      [...queryKeys.calls.all(workflowId), callId] as const,
  },

  /** Separate root so exact workflow-detail invalidation does not cascade. */
  runs: {
    all: (workflowId: string) => ["runs", workflowId] as const,
    lists: (workflowId: string) =>
      [...queryKeys.runs.all(workflowId), "list"] as const,
    list: (workflowId: string, params?: PaginateParams) =>
      [...queryKeys.runs.lists(workflowId), params ?? {}] as const,
    detail: (workflowId: string, runId: string) =>
      [...queryKeys.runs.all(workflowId), runId] as const,
  },

  globalVariables: {
    all: ["global-variables"] as const,
    list: () => [...queryKeys.globalVariables.all, "list"] as const,
    detail: (id: string) => [...queryKeys.globalVariables.all, id] as const,
  },

  staticVariables: {
    all: (workflowId: string) =>
      [...queryKeys.workflows.detail(workflowId), "variables"] as const,
    list: (workflowId: string) =>
      [...queryKeys.staticVariables.all(workflowId), "list"] as const,
    detail: (workflowId: string, name: string) =>
      [...queryKeys.staticVariables.all(workflowId), name] as const,
  },

  callVariables: {
    all: (workflowId: string, callId: string) =>
      [...queryKeys.calls.detail(workflowId, callId), "variables"] as const,
    list: (workflowId: string, callId: string) =>
      [...queryKeys.callVariables.all(workflowId, callId), "list"] as const,
    detail: (workflowId: string, callId: string, name: string) =>
      [...queryKeys.callVariables.all(workflowId, callId), name] as const,
  },

  /** Kept apart: any variable change (global, static or call) affects it. */
  availableVariables: {
    all: ["available-variables"] as const,
    list: (workflowId: string, callId: string) =>
      [...queryKeys.availableVariables.all, workflowId, callId] as const,
  },

  responseKeys: {
    list: (workflowId: string, callId: string) =>
      [
        ...queryKeys.calls.detail(workflowId, callId),
        "response-keys",
      ] as const,
  },
} as const
