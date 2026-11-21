"use client"

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import { listFeed } from "./api"

export const FEED_PREVIEW_LIMIT = 5
export const FEED_PAGE_SIZE = 40

export function useFeedPreview(workflowId: string) {
  return useQuery({
    queryKey: queryKeys.feed.preview(workflowId),
    queryFn: () =>
      listFeed({ workflowId, limit: FEED_PREVIEW_LIMIT }),
    enabled: Boolean(workflowId),
  })
}

export function useFeedInfinite(workflowId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.feed.list(workflowId),
    enabled: Boolean(workflowId) && enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listFeed({
        workflowId,
        cursor: pageParam,
        limit: FEED_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  })
}
