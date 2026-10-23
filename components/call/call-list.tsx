"use client"

import { CallDrawer } from "@/components/call/call-drawer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { VariableText } from "@/components/variable/variable-text"
import { useCalls, useCopyCall, useDeleteCall } from "@/lib/call/hooks"
import type { Call } from "@/lib/call/types"
import { queryKeys } from "@/lib/query/keys"
import { cn } from "@/lib/utils"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useQueryClient } from "@tanstack/react-query"
import { CopyIcon, GripVerticalIcon, XIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

const EMPTY_CALLS: Call[] = []

const DROP_ANIMATION: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
}

function methodClass(method: string | undefined) {
  switch ((method ?? "").toUpperCase()) {
    case "GET":
      return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    case "POST":
      return "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
    case "PUT":
      return "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
    case "PATCH":
      return "bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-300"
    case "DELETE":
      return "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function statusPill(status: string | undefined) {
  if (status === "success") {
    return {
      label: "OK",
      className:
        "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      dot: "bg-emerald-500",
    }
  }
  if (status === "failed" || status === "error") {
    return {
      label: "Failed",
      className: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
      dot: "bg-destructive",
    }
  }
  if (status === "running") {
    return {
      label: "Running",
      className: "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
      dot: "bg-sky-500",
    }
  }
  if (status === "skipped") {
    return {
      label: "Skipped",
      className: "bg-muted text-muted-foreground",
      dot: "bg-muted-foreground/50",
    }
  }
  return {
    label: "Never",
    className: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
  }
}

function formatLatency(ms: number | undefined) {
  if (ms == null) return null
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.round(ms)} ms`
}

function mergeCallOrder(serverIds: string[], localOrder: string[] | null) {
  if (!localOrder) return serverIds
  const next = localOrder.filter((id) => serverIds.includes(id))
  for (const id of serverIds) {
    if (!next.includes(id)) next.push(id)
  }
  return next
}

function CallCard({
  call,
  index,
  hasNext,
  overlay,
  onOpen,
  onRemove,
  onDuplicate,
  deleting,
}: {
  call: Call
  index: number
  hasNext?: boolean
  overlay?: boolean
  onOpen?: () => void
  onRemove?: () => void
  onDuplicate?: () => void
  deleting?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: call.id,
    disabled: !!overlay,
  })

  useEffect(() => {
    if (!overlay) return
    document.body.style.cursor = "grabbing"
    return () => {
      document.body.style.cursor = ""
    }
  }, [overlay])

  const method = (call.method ?? "GET").toUpperCase()
  const pill = statusPill(call.lastStatus)
  const latency = formatLatency(call.lastLatencyMs)

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={
        overlay
          ? undefined
          : {
              transform: CSS.Transform.toString(transform),
              transition,
            }
      }
      className={cn(
        "flex gap-4",
        !overlay && hasNext && "pb-3",
        overlay && "scale-[1.01]",
        isDragging && !overlay && "opacity-50"
      )}
    >
      <div
        className={cn(
          "group min-w-0 flex-1 overflow-hidden rounded-[14px] border border-border bg-background",
          overlay && "shadow-lg"
        )}
      >
        <div className="flex flex-wrap items-center gap-3 px-[18px] py-3.5 sm:gap-4">
          {!overlay && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Reorder ${call.name}`}
              className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
            >
              <GripVerticalIcon className="size-4" />
            </button>
          )}
          <span
            title={method}
            className={cn(
              "flex h-7 w-14 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold",
              methodClass(call.method)
            )}
          >
            {method === "DELETE"
              ? "DEL"
              : method === "OPTIONS"
                ? "OPT"
                : method}
          </span>

          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 flex-1 basis-[260px] text-left"
          >
            <span className="block truncate text-[15px] font-semibold text-foreground">
              {call.name}
            </span>
            <span className="mt-1 block overflow-hidden font-mono text-[12.5px] leading-5 text-ellipsis whitespace-nowrap text-muted-foreground">
              <VariableText text={call.url || "—"} variant="chip" />
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {latency && (
              <div className="flex min-w-14 flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Latency</span>
                <span className="text-sm font-semibold">{latency}</span>
              </div>
            )}

            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium",
                pill.className
              )}
              aria-label={call.lastStatus ?? "never run"}
            >
              <span className={cn("size-1.5 rounded-full", pill.dot)} />
              {pill.label}
            </span>

            <div className="flex items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label={`Duplicate ${call.name}`}
                onClick={onDuplicate}
              >
                <CopyIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label={`Delete ${call.name}`}
                disabled={deleting}
                onClick={onRemove}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CallList({ workflowId }: { workflowId: string }) {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editedId, setEditedId] = useState<string | null>(null)
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [callToDelete, setCallToDelete] = useState<Call | null>(null)

  const callsQuery = useCalls(workflowId)
  const deleteMutation = useDeleteCall(workflowId)
  const copyMutation = useCopyCall(workflowId)

  const calls = callsQuery.data ?? EMPTY_CALLS

  const orderedCalls = useMemo(() => {
    const byPosition = [...calls].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0)
    )
    const serverIds = byPosition.map((call) => call.id)
    const ids = mergeCallOrder(serverIds, localOrder)
    const byId = new Map(calls.map((call) => [call.id, call]))
    return ids
      .map((id) => byId.get(id))
      .filter((call): call is Call => call != null)
  }, [calls, localOrder])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const openCreate = () => {
    setEditedId(null)
    setDrawerOpen(true)
  }

  const openEdit = (callId: string) => {
    setEditedId(callId)
    setDrawerOpen(true)
  }

  const confirmDelete = () => {
    const id = callToDelete?.id
    if (!id) return
    deleteMutation.mutate(id, {
      onSuccess: () => setCallToDelete(null),
    })
  }

  const handleDuplicate = (call: Call) => {
    copyMutation.mutate(call.id)
  }

  const applyOrder = (next: string[]) => {
    setLocalOrder(next)
    queryClient.setQueryData<Call[]>(
      queryKeys.calls.list(workflowId),
      (old) => {
        if (!old) return old
        const byId = new Map(old.map((call) => [call.id, call]))
        return next
          .map((id) => byId.get(id))
          .filter((call): call is Call => call != null)
      }
    )
  }

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = orderedCalls.map((call) => call.id)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    applyOrder(arrayMove(ids, from, to))
  }

  const active = orderedCalls.find((call) => call.id === activeId)

  return (
    <section className="container mx-auto mt-10 flex flex-col gap-5">
      {callsQuery.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : callsQuery.error ? (
        <p className="text-destructive">{callsQuery.error.message}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={orderedCalls.map((call) => call.id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="flex flex-col">
              {orderedCalls.map((call, index) => (
                <li key={call.id} className="list-none">
                  <CallCard
                    call={call}
                    index={index}
                    hasNext
                    onOpen={() => openEdit(call.id)}
                    onRemove={() => setCallToDelete(call)}
                    onDuplicate={() => handleDuplicate(call)}
                    deleting={
                      deleteMutation.isPending &&
                      deleteMutation.variables === call.id
                    }
                  />
                </li>
              ))}
            </ol>
          </SortableContext>
          <DragOverlay dropAnimation={DROP_ANIMATION}>
            {active ? (
              <CallCard
                call={active}
                index={orderedCalls.findIndex((c) => c.id === active.id)}
                overlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <AlertDialog
        open={callToDelete != null}
        onOpenChange={(open) => {
          if (!open) setCallToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete call?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {callToDelete?.name}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                confirmDelete()
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CallDrawer
        workflowId={workflowId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        callId={editedId}
      />
    </section>
  )
}
