"use client"

import { CallDrawer } from "@/components/call/call-drawer"
import { Button } from "@/components/ui/button"
import { useCalls, useCreateCall, useDeleteCall } from "@/lib/call/hooks"
import type { Call, CallMethod } from "@/lib/call/types"
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

/** Soft elevation from dnd-kit Sortable Item. */
const ITEM_SHADOW =
  "shadow-[0_0_0_1px_rgba(63,63,68,0.05),0_1px_3px_0_rgba(34,33,81,0.15)]"
const ITEM_SHADOW_PICKED =
  "shadow-[0_0_0_1px_rgba(63,63,68,0.05),-1px_0_15px_0_rgba(34,33,81,0.01),0_15px_15px_0_rgba(34,33,81,0.25)]"

const METHODS: CallMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]

function methodAccent(method: string | undefined) {
  switch ((method ?? "").toUpperCase()) {
    case "GET":
      return "bg-emerald-500"
    case "POST":
      return "bg-amber-500"
    case "PUT":
      return "bg-sky-500"
    case "PATCH":
      return "bg-violet-500"
    case "DELETE":
      return "bg-red-500"
    default:
      return "bg-muted-foreground/40"
  }
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
  const parts = url.split(/(\{\{[^}]+\}\})/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("{{") ? (
          <span key={i} className="text-sky-600 dark:text-sky-400">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
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
  overlay,
  onOpen,
  onRemove,
  onDuplicate,
  deleting,
}: {
  call: Call
  index: number
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
          "group relative flex items-center gap-2.5 rounded-md bg-card py-3.5 pr-3 pl-3.5 outline-none transition-[box-shadow] duration-200",
          ITEM_SHADOW,
          isDragging && !overlay && "opacity-50",
          overlay && ITEM_SHADOW_PICKED,
          !overlay && !isDragging && "hover:shadow-md"
        )}
      >
        <span
          className={cn(
            "absolute top-0 bottom-0 left-0 w-[3px] rounded-l-md",
            methodAccent(call.method)
          )}
          aria-hidden
        />

        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reorder"
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/40 hover:bg-muted hover:text-foreground active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={onOpen}
          title={method}
          className={cn(
            "flex h-9 w-12 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold",
            methodClass(call.method)
          )}
        >
          {method === "DELETE"
            ? "DEL"
            : method === "OPTIONS"
              ? "OPT"
              : method}
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="truncate text-sm font-medium text-foreground">
              {call.name}
            </span>
          </div>
          <span className="mt-0.5 block w-full truncate font-mono text-xs text-muted-foreground">
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
            className="hover:text-destructive"
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

  const callsQuery = useCalls(workflowId)
  const deleteMutation = useDeleteCall(workflowId)
  const createMutation = useCreateCall(workflowId)

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

  const handleDelete = (callId: string, name: string) => {
    if (!window.confirm(`Delete call "${name}"?`)) return
    deleteMutation.mutate(callId)
  }

  const handleDuplicate = (call: Call) => {
    const method = (call.method ?? "GET").toUpperCase()
    createMutation.mutate({
      name: `${call.name} (copy)`,
      method: (METHODS.includes(method as CallMethod)
        ? method
        : "GET") as CallMethod,
      url: call.url || "/",
    })
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
    <section className="flex flex-col items-center gap-3">
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
            <ol className="mx-auto flex w-full max-w-xl flex-col items-stretch gap-0">
              {orderedCalls.map((call, index) => (
                <li key={call.id} className="relative list-none">
                  <CallCard
                    call={call}
                    index={index}
                    onOpen={() => openEdit(call.id)}
                    onRemove={() => handleDelete(call.id, call.name)}
                    onDuplicate={() => handleDuplicate(call)}
                    deleting={
                      deleteMutation.isPending &&
                      deleteMutation.variables === call.id
                    }
                  />
                  {index < orderedCalls.length && (
                    <div
                      className="flex h-5 items-center justify-center text-muted-foreground/40"
                      aria-hidden
                    >
                      <ArrowDownIcon className="size-3.5" />
                    </div>
                  )}
                </li>
              ))}
              <li className="list-none">
                <button
                  type="button"
                  onClick={openCreate}
                  className={cn(
                    "flex min-h-[62px] w-full items-center justify-center gap-2 rounded-md border border-dashed bg-card/50 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-card hover:text-foreground",
                    ITEM_SHADOW
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
                <CallCard
                  call={active}
                  index={orderedCalls.indexOf(active)}
                  overlay
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {(deleteMutation.error || createMutation.error) && (
        <p className="text-destructive">
          {deleteMutation.error?.message ?? createMutation.error?.message}
        </p>
      )}

      <CallDrawer
        workflowId={workflowId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        callId={editedId}
      />
    </section>
  )
}
