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
import {
  ArrowDownIcon,
  CopyIcon,
  GripVerticalIcon,
  PlusIcon,
  XIcon,
} from "lucide-react"
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
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    case "POST":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
    case "PUT":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-400"
    case "PATCH":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-400"
    case "DELETE":
      return "bg-red-500/15 text-red-700 dark:text-red-400"
    case "HEAD":
    case "OPTIONS":
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function statusDotClass(status: string | undefined) {
  if (status === "failed" || status === "error") return "bg-destructive"
  if (status === "success") return "bg-emerald-500"
  if (status === "running") return "bg-sky-500"
  if (status === "skipped") return "bg-muted-foreground/50"
  return "bg-muted-foreground/30"
}

function UrlPreview({ url }: { url: string }) {
  return <VariableText text={url} />
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
  overlay,
  onOpen,
  onRemove,
  onDuplicate,
  deleting,
}: {
  call: Call
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
      className={cn(overlay && "scale-105")}
    >
      <div
        className={cn(
          "group relative flex items-center gap-2.5 rounded-md border bg-card py-3.5 pr-3 pl-3.5 duration-200 outline-none",
          isDragging && !overlay && "opacity-50",
          !overlay && !isDragging
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reorder"
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/40 active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={onOpen}
          title={method}
          className={cn(
            "flex h-9 w-12 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
            methodClass(call.method)
          )}
        >
          {method === "DELETE" ? "DEL" : method === "OPTIONS" ? "OPT" : method}
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">
              {call.name}
            </span>
          </div>
          <span className="mt-0.5 block w-full truncate text-xs text-muted-foreground">
            <UrlPreview url={call.url || "—"} />
          </span>
        </button>

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Duplicate ${call.name}`}
            onClick={onDuplicate}
          >
            <CopyIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Delete ${call.name}`}
            disabled={deleting}
            onClick={onRemove}
          >
            <XIcon />
          </Button>
        </div>

        <span
          className={cn(
            "size-2 shrink-0 self-center rounded-full",
            statusDotClass(call.lastStatus)
          )}
          title={call.lastStatus ?? "never run"}
          aria-label={call.lastStatus ?? "never run"}
        />
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
    <section className="flex flex-col items-center gap-3 py-10">
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
            <ol className="mx-auto flex w-full max-w-xl flex-col items-stretch">
              {orderedCalls.map((call) => (
                <li key={call.id} className="relative list-none">
                  <CallCard
                    call={call}
                    onOpen={() => openEdit(call.id)}
                    onRemove={() => setCallToDelete(call)}
                    onDuplicate={() => handleDuplicate(call)}
                    deleting={
                      deleteMutation.isPending &&
                      deleteMutation.variables === call.id
                    }
                  />
                  <div
                    className="flex h-8 flex-col items-center justify-center text-muted-foreground/50"
                    aria-hidden
                  >
                    <span className="w-px flex-1 bg-border" />
                    <ArrowDownIcon className="size-3.5 shrink-0" />
                    <span className="w-px flex-1 bg-border" />
                  </div>
                </li>
              ))}
              <li className="list-none">
                <button
                  type="button"
                  onClick={openCreate}
                  className={cn(
                    "flex min-h-15.5 w-full items-center justify-center gap-2 rounded-md border border-dashed bg-card/50 text-sm text-muted-foreground transition-colors"
                  )}
                >
                  <PlusIcon className="size-4" />
                  Add call
                </button>
              </li>
            </ol>
          </SortableContext>
          <DragOverlay dropAnimation={DROP_ANIMATION}>
            {active ? (
              <div className="w-full max-w-xl">
                <CallCard call={active} overlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {(deleteMutation.error || copyMutation.error) && (
        <p className="text-destructive">
          {deleteMutation.error?.message ?? copyMutation.error?.message}
        </p>
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
