"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
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

/** Page size for the library drawer infinite scroll. */
export const LIBRARY_PAGE_SIZE = 40

export function useLibraryItems(
  search: string,
  methods: string[],
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: queryKeys.library.list(search, methods),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listLibraryItems({
        search: search || undefined,
        methods,
        sortBy: "createdAt",
        orderBy: "desc",
        page: pageParam,
        limit: LIBRARY_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => {
      const page = lastPage.page || 1
      if (lastPage.members.length < LIBRARY_PAGE_SIZE) return undefined
      if (lastPage.totalPages > 0 && page >= lastPage.totalPages) {
        return undefined
      }
      return page + 1
    },
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

/**
 * Stores the reviewed candidates. List refresh comes from `library.imported`
 * realtime (and a local invalidate so the drawer updates immediately).
 */
export function useConfirmLibraryImport() {
  const invalidate = useInvalidateLibrary()
  return useMutation({
    mutationFn: (items: { key: string; payload: LibraryItemInput }[]) =>
      confirmLibraryImport(items),
    onSuccess: invalidate,
  })
}
