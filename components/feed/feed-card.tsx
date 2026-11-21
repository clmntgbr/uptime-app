"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { FeedListDrawer } from "@/components/feed/feed-list-drawer"
import { FeedRow } from "@/components/feed/feed-row"
import { IncidentDetailDrawer } from "@/components/incident/incident-detail-drawer"
import { useFeedPreview } from "@/lib/feed/hooks"
import { SHEET_CLOSE_MS } from "@/components/ui/sheet"
import {
  OVERVIEW_LIST_CLASS,
  OVERVIEW_PREVIEW_LIMIT,
} from "@/lib/workflow/overview-cards"
import { cn } from "@/lib/utils"
import { ActivityIcon } from "lucide-react"

export function FeedCard({ workflowId }: { workflowId: string }) {
  const feedQuery = useFeedPreview(workflowId)
  const [listOpen, setListOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const members = feedQuery.data?.members ?? []
  const isLoading = feedQuery.isLoading
  const isError = feedQuery.isError
  const isEmpty = !isLoading && !isError && members.length === 0

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
      <Card size="sm" className="h-full md:col-span-1">
        <CardHeader className="border-b">
          {isLoading ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            <CardTitle>Activity</CardTitle>
          )}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <div className={cn(OVERVIEW_LIST_CLASS, "gap-3")}>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-4/5" />
            </div>
          ) : isError ? (
            <div className={cn(OVERVIEW_LIST_CLASS, "justify-center gap-2")}>
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
          ) : isEmpty ? (
            <div
              className={cn(OVERVIEW_LIST_CLASS, "items-center justify-center")}
            >
              <Empty className="border-0 p-4 md:p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ActivityIcon />
                  </EmptyMedia>
                  <EmptyTitle>No activity</EmptyTitle>
                  <EmptyDescription>
                    Failures and incident changes will show up here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <ul className={OVERVIEW_LIST_CLASS}>
              {members.slice(0, OVERVIEW_PREVIEW_LIMIT).map((event) => (
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
        </CardContent>
        <CardFooter className="mt-auto min-h-10 border-t pt-3">
          {!isLoading && !isError && !isEmpty ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-0"
              onClick={() => setListOpen(true)}
            >
              See all
            </Button>
          ) : (
            <span className="invisible text-sm" aria-hidden>
              See all
            </span>
          )}
        </CardFooter>
      </Card>

      <FeedListDrawer
        workflowId={workflowId}
        open={listOpen}
        onOpenChange={setListOpen}
      />

      <IncidentDetailDrawer
        workflowId={workflowId}
        incidentId={detailId}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
      />
    </>
  )
}
