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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui/table"
import { VariableText } from "@/components/variable/variable-text"
import {
  useCalls,
  useCopyCall,
  useDeleteCall,
  useReorderCalls,
} from "@/lib/call/hooks"
import type { Call, CallRecentRun } from "@/lib/call/types"
import {
  useGlobalVariables,
  useStaticVariables,
} from "@/lib/variable/hooks"
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
import {
  CopyIcon,
  EllipsisIcon,
  GripVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import {
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
} from "react"

const EMPTY_CALLS: Call[] = []

const DROP_ANIMATION: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
}

/** Fixed column widths so the row keeps its layout while dragging. */
const COL = {
  grip: "w-10",
  method: "w-16",
  spark: "w-36",
  status: "w-28",
  actions: "w-10",
} as const

const SPARK_MIN_PX = 3
const SPARK_MAX_PX = 24

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

function statusBadge(status: string | undefined) {
  if (status === "success") {
    return { label: "Success", variant: "secondary" as const }
  }
  if (status === "failed" || status === "error") {
    return { label: "Failed", variant: "destructive" as const }
  }
  if (status === "running") {
    return { label: "Running", variant: "default" as const }
  }
  if (status === "skipped") {
    return { label: "Skipped", variant: "outline" as const }
  }
  return { label: "Never", variant: "outline" as const }
}

function sparkBarClass(status: string | undefined) {
  if (status === "success") return "bg-[#8FD2B0] dark:bg-emerald-400/80"
  if (status === "failed") return "bg-orange-400 dark:bg-orange-400/90"
  if (status === "error") return "bg-red-500 dark:bg-red-400"
  if (status === "skipped") return "bg-muted-foreground/35"
  if (status === "running") return "bg-sky-400"
  return "bg-muted-foreground/30"
}

function formatTimingMs(ms: number) {
  if (!Number.isFinite(ms)) return "—"
  if (Math.abs(ms) < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  return `${seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1)}s`
}

function formatHoverStamp(iso: string | undefined) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  })
  const day = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
  return `${time} · ${day}`
}

function timingRows(run: CallRecentRun) {
  const dns = run.timings?.dns ?? 0
  const connect = run.timings?.connect ?? 0
  const tls = run.timings?.tls ?? 0
  const transfer = run.timings?.transfer ?? 0
  const waiting = Math.max(
    0,
    (run.latencyMs ?? 0) - dns - connect - tls - transfer
  )
  return [
    { key: "dns", label: "Name lookup", swatch: "bg-violet-500", ms: dns },
    { key: "connect", label: "Connection", swatch: "bg-blue-500", ms: connect },
    { key: "tls", label: "TLS handshake", swatch: "bg-teal-400", ms: tls },
    { key: "waiting", label: "Waiting", swatch: "bg-amber-400", ms: waiting },
    {
      key: "transfer",
      label: "Data transfer",
      swatch: "bg-emerald-500",
      ms: transfer,
    },
  ]
}

function LatencySparkline({ runs }: { runs: CallRecentRun[] }) {
  if (!runs.length) return null

  const maxLatency = Math.max(1, ...runs.map((run) => run.latencyMs ?? 0))

  return (
    <div
      className="flex h-6 items-end gap-0.5"
      role="img"
      aria-label={`Latency of the last ${runs.length} runs`}
    >
      {runs.map((run) => {
        const ratio = (run.latencyMs ?? 0) / maxLatency
        const height = Math.max(SPARK_MIN_PX, Math.round(ratio * SPARK_MAX_PX))
        const total =
          run.latencyMs != null ? formatTimingMs(run.latencyMs) : null
        const stamp = formatHoverStamp(run.finishedAt)
        const status =
          run.status.charAt(0).toUpperCase() + run.status.slice(1)
        const phases = timingRows(run)
        const phaseMax = Math.max(1, ...phases.map((phase) => phase.ms))

        return (
          <HoverCard key={run.id} openDelay={120} closeDelay={80}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="flex h-6 w-1.5 items-end justify-center"
                aria-label={[stamp, total, run.status]
                  .filter(Boolean)
                  .join(", ")}
              >
                <span
                  className={cn(
                    "block w-1 rounded-[1px]",
                    sparkBarClass(run.status)
                  )}
                  style={{ height }}
                />
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="w-64 p-3">
              <div className="flex flex-col gap-3">
                {stamp && (
                  <p className="text-[11px] text-muted-foreground">{stamp}</p>
                )}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        sparkBarClass(run.status)
                      )}
                    />
                    {status}
                  </span>
                  {run.httpStatus != null && (
                    <span className="text-muted-foreground">
                      HTTP {run.httpStatus}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {total ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="flex flex-col gap-2 border-t border-border pt-2.5">
                  {phases.map((phase) => {
                    const width = Math.round((phase.ms / phaseMax) * 100)
                    return (
                      <div key={phase.key} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-[2px]",
                              phase.swatch
                            )}
                          />
                          <span className="min-w-0 flex-1">{phase.label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatTimingMs(phase.ms)}
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full", phase.swatch)}
                            style={{
                              width: `${phase.ms > 0 ? Math.max(width, 6) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )
      })}
    </div>
  )
}

function CallTableColgroup() {
  return (
    <colgroup>
      <col className={COL.grip} />
      <col className={COL.method} />
      <col />
      <col className={COL.spark} />
      <col className={COL.status} />
      <col className={COL.actions} />
    </colgroup>
  )
}

function CallCells({
  call,
  overlay,
  variableValues,
  dragHandleProps,
  onOpen,
  onRemove,
  onDuplicate,
  deleting,
}: {
  call: Call
  overlay?: boolean
  variableValues?: Record<string, string>
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>
  onOpen?: () => void
  onRemove?: () => void
  onDuplicate?: () => void
  deleting?: boolean
}) {
  const method = (call.method ?? "GET").toUpperCase()
  const status = statusBadge(call.lastStatus)

  return (
    <>
      <TableCell className={cn(COL.grip, "px-1")}>
        {!overlay ? (
          <button
            type="button"
            {...dragHandleProps}
            aria-label={`Reorder ${call.name}`}
            className="flex size-8 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
          >
            <GripVerticalIcon className="size-4" />
          </button>
        ) : (
          <span className="flex size-8 items-center justify-center text-muted-foreground/50">
            <GripVerticalIcon className="size-4" />
          </span>
        )}
      </TableCell>
      <TableCell className={COL.method}>
        <span
          title={method}
          className={cn(
            "inline-flex h-6 w-14 items-center justify-center rounded-md font-mono text-[0.625rem] font-semibold",
            methodClass(call.method)
          )}
        >
          {method}
        </span>
      </TableCell>
      <TableCell className="max-w-0">
        <span className="block truncate font-mono text-[12.5px] text-muted-foreground">
          <VariableText
            text={call.url || "—"}
            variant="chip"
            values={variableValues}
          />
        </span>
      </TableCell>
      <TableCell className={COL.spark}>
        {call.recentRuns && call.recentRuns.length > 0 ? (
          <LatencySparkline runs={call.recentRuns} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className={COL.status}>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
      <TableCell className={COL.actions}>
        {!overlay ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                aria-label={`Open menu for ${call.name}`}
              >
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => onOpen?.()}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDuplicate?.()}>
                  <CopyIcon />
                  Duplicate
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={deleting}
                onSelect={() => onRemove?.()}
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </>
  )
}

function SortableCallRow({
  call,
  variableValues,
  onOpen,
  onRemove,
  onDuplicate,
  deleting,
}: {
  call: Call
  variableValues?: Record<string, string>
  onOpen: () => void
  onRemove: () => void
  onDuplicate: () => void
  deleting?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: call.id })

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "opacity-40")}
      data-state={isDragging ? "selected" : undefined}
    >
      <CallCells
        call={call}
        variableValues={variableValues}
        dragHandleProps={{ ...attributes, ...listeners }}
        onOpen={onOpen}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        deleting={deleting}
      />
    </TableRow>
  )
}

function CallRowOverlay({
  call,
  variableValues,
  width,
}: {
  call: Call
  variableValues?: Record<string, string>
  width: number
}) {
  useEffect(() => {
    document.body.style.cursor = "grabbing"
    return () => {
      document.body.style.cursor = ""
    }
  }, [])

  return (
    <TableRoot
      className="table-fixed border-collapse bg-background shadow-lg ring-1 ring-foreground/10"
      style={{ width: width || undefined }}
    >
      <CallTableColgroup />
      <tbody>
        <TableRow className="border-b bg-background hover:bg-background">
          <CallCells call={call} overlay variableValues={variableValues} />
        </TableRow>
      </tbody>
    </TableRoot>
  )
}

export function CallList({ workflowId }: { workflowId: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editedId, setEditedId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tableWidth, setTableWidth] = useState(0)
  const [callToDelete, setCallToDelete] = useState<Call | null>(null)

  const callsQuery = useCalls(workflowId)
  const globalsQuery = useGlobalVariables()
  const staticsQuery = useStaticVariables(workflowId)
  const deleteMutation = useDeleteCall(workflowId)
  const copyMutation = useCopyCall(workflowId)
  const reorderMutation = useReorderCalls(workflowId)

  const variableValues = useMemo(() => {
    const values: Record<string, string> = {}
    for (const variable of globalsQuery.data ?? []) {
      if (variable.value) values[variable.name] = variable.value
    }
    for (const variable of staticsQuery.data ?? []) {
      if (variable.value) values[variable.name] = variable.value
    }
    return values
  }, [globalsQuery.data, staticsQuery.data])

  const calls = callsQuery.data ?? EMPTY_CALLS

  const orderedCalls = useMemo(
    () => [...calls].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [calls]
  )

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
    reorderMutation.mutate(arrayMove(ids, from, to))
  }

  const active = orderedCalls.find((call) => call.id === activeId)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openCreate}
          disabled={orderedCalls.length >= 20}
        >
          <PlusIcon data-icon="inline-start" />
          Add call
        </Button>
      </div>

      {callsQuery.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : callsQuery.error ? (
        <p className="text-destructive">{callsQuery.error.message}</p>
      ) : orderedCalls.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
          <p className="text-sm text-muted-foreground">No calls yet.</p>
          <Button type="button" size="sm" onClick={openCreate}>
            <PlusIcon data-icon="inline-start" />
            Add call
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div
            className="overflow-hidden rounded-lg border bg-card"
            ref={(node) => {
              if (node) setTableWidth(node.getBoundingClientRect().width)
            }}
          >
            <SortableContext
              items={orderedCalls.map((call) => call.id)}
              strategy={verticalListSortingStrategy}
            >
              <Table className="table-fixed">
                <CallTableColgroup />
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={COL.grip}>
                      <span className="sr-only">Reorder</span>
                    </TableHead>
                    <TableHead className={COL.method}>Method</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className={COL.spark}>Latency</TableHead>
                    <TableHead className={COL.status}>Status</TableHead>
                    <TableHead className={COL.actions}>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderedCalls.map((call) => (
                    <SortableCallRow
                      key={call.id}
                      call={call}
                      variableValues={variableValues}
                      onOpen={() => openEdit(call.id)}
                      onRemove={() => setCallToDelete(call)}
                      onDuplicate={() => handleDuplicate(call)}
                      deleting={
                        deleteMutation.isPending &&
                        deleteMutation.variables === call.id
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </SortableContext>
          </div>
          <DragOverlay dropAnimation={DROP_ANIMATION}>
            {active ? (
              <CallRowOverlay
                call={active}
                variableValues={variableValues}
                width={tableWidth}
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
