"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError, formatApiErrorToast } from "@/lib/api-error"
import { queryKeys } from "@/lib/query/keys"
import { toast } from "sonner"
import {
  confirmLibraryImport,
  createLibraryItem,
  deleteLibraryItem,
  getLibraryItem,
  insertLibraryItem,
  listLibraryItems,
  previewLibraryImport,
  updateLibraryItem,
} from "./api"
import type { LibraryImportFormat, LibraryItemInput } from "./types"

export function useLibraryItems(search: string, methods: string[]) {
  return useQuery({
    queryKey: queryKeys.library.list(search, methods),
    queryFn: () =>
      listLibraryItems({
        search: search || undefined,
        methods,
        sortBy: "name",
        orderBy: "asc",
        limit: 200,
      }),
  })
}

export function useLibraryItem(id: string | null) {
  return useQuery({
    queryKey: queryKeys.library.detail(id ?? ""),
    queryFn: () => getLibraryItem(id as string),
    enabled: !!id,
  })
}

/** Every library list (whatever search is active) must refetch after a write. */
function useInvalidateLibrary() {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.library.all })
}

export function useCreateLibraryItem() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: (input: LibraryItemInput) => createLibraryItem(input),
    onSuccess: invalidate,
  })
}

export function useUpdateLibraryItem() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LibraryItemInput }) =>
      updateLibraryItem(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteLibraryItem() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: (id: string) => deleteLibraryItem(id),
    onSuccess: invalidate,
  })
}

/** Adds a library item to the end of a workflow. Refreshes the workflow's calls. */
export function useInsertLibraryItem(workflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => insertLibraryItem(workflowId, itemId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows.detail(workflowId),
      }),
    onError: (error) => {
      if (error instanceof ApiError) {
        const { title, description } = formatApiErrorToast(error)
        toast.error(title, { description })
        return
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to add library item"
      )
    },
  })
}

export function usePreviewLibraryImport() {
  return useMutation({
    mutationFn: (input: {
      format: LibraryImportFormat
      content: string
      baseUrl?: string
    }) => previewLibraryImport(input),
  })
}

/** Stores the reviewed candidates. Refreshes every library list on success. */
export function useConfirmLibraryImport() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: (items: { key: string; payload: LibraryItemInput }[]) =>
      confirmLibraryImport(items),
    onSuccess: invalidate,
  })
}
