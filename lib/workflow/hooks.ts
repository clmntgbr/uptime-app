"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { PaginateParams } from "@/lib/paginate"
import { queryKeys } from "@/lib/query/keys"
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  listWorkflows,
  runWorkflow,
  updateWorkflow,
} from "./api"
import { WorkflowInput } from "./types"

export function useWorkflows(params?: PaginateParams) {
  return useQuery({
    queryKey: queryKeys.workflows.list(params),
    queryFn: () => listWorkflows(params),
    placeholderData: keepPreviousData,
  })
}

export function useWorkflow(id: string | null) {
  return useQuery({
    queryKey: queryKeys.workflows.detail(id ?? ""),
    queryFn: () => getWorkflow(id as string),
    enabled: !!id,
  })
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: WorkflowInput) => createWorkflow(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() }),
  })
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: WorkflowInput }) =>
      updateWorkflow(id, input),
    onSuccess: (_data, { id }) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflows.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflows.detail(id),
        }),
      ]),
  })
}

export function useRunWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => runWorkflow(id),
    onSuccess: (_data, id) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflows.detail(id),
          exact: true,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all }),
      ]),
  })
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.workflows.detail(id) })
      return queryClient.invalidateQueries({
        queryKey: queryKeys.workflows.lists(),
      })
    },
  })
}
