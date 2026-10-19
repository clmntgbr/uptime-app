"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { PaginateParams } from "@/lib/paginate"
import { queryKeys } from "@/lib/query/keys"
import { getRun, listRuns } from "./api"

export function useRuns(workflowId: string, params?: PaginateParams) {
  return useQuery({
    queryKey: queryKeys.runs.list(workflowId, params),
    queryFn: () => listRuns(workflowId, params),
    placeholderData: keepPreviousData,
    enabled: !!workflowId,
  })
}

export function useRun(workflowId: string, runId: string | null) {
  return useQuery({
    queryKey: queryKeys.runs.detail(workflowId, runId ?? ""),
    queryFn: () => getRun(workflowId, runId as string),
    enabled: !!workflowId && !!runId,
  })
}
