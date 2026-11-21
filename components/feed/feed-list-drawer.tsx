"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  SHEET_CLOSE_MS,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { FeedRow } from "@/components/feed/feed-row"
import { IncidentDetailDrawer } from "@/components/incident/incident-detail-drawer"
import { useFeedInfinite } from "@/lib/feed/hooks"

export function FeedListDrawer({
  workflowId,
  open,
  onOpenChange,
}: {
  workflowId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const feedQuery = useFeedInfinite(workflowId, open)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const members = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.members) ?? [],
    [feedQuery.data]
  )

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || !open) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          feedQuery.hasNextPage &&
          !feedQuery.isFetchingNextPage
        ) {
          void feedQuery.fetchNextPage()
        }
      },
      { rootMargin: "120px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [
    open,
    feedQuery.hasNextPage,
    feedQuery.isFetchingNextPage,
    feedQuery.fetchNextPage,
  ])

  const openDetail = (id: string) => {
    setDetailId(id)
    setDetailOpen(true)
  }

  const handleDetailOpenChange = (next: boolean) => {
    setDetailOpen(next)
    if (!next) {
      window.setTimeout(() => setDetailId(null), SHEET_CLOSE_MS + 50)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Activity</SheetTitle>
            <SheetDescription>
              Anomalies and incident transitions for this workflow.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-3 px-4 pb-6">
            {feedQuery.isLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : feedQuery.error ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-destructive">
                  {feedQuery.error.message}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void feedQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              <ul className="flex flex-col">
                {members.map((event) => (
                  <FeedRow
                    key={event.id}
                    event={event}
                    onOpen={
                      event.incidentId
                        ? () => openDetail(event.incidentId as string)
                        : undefined
                    }
                  />
                ))}
              </ul>
            )}
            <div ref={loadMoreRef} className="h-4 w-full" />
            {feedQuery.isFetchingNextPage ? (
              <p className="text-xs text-muted-foreground">Loading more…</p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <IncidentDetailDrawer
        workflowId={workflowId}
        incidentId={detailId}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        nested
      />
    </>
  )
}
