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
import {
  useCalls,
  useCopyCall,
  useDeleteCall,
  useReorderCalls,
} from "@/lib/call/hooks"
import type { Call } from "@/lib/call/types"
import { cn } from "@/lib/utils"
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  CopyIcon,
  Maximize2Icon,
  PencilIcon,
  Trash2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react"

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2
const ZOOM_STEP = 0.1
const DEFAULT_ZOOM = 1.25
const PAN_THRESHOLD = 4
const BASE_CARD_WIDTH = 280
const CARD_RADIUS = 16
/** Fan along the top-right corner arc (degrees from +X, CCW). */
const CORNER_FAN_ANGLES = [88, 45, 2] as const

const DROP_ANIMATION: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
}

function sortCalls(calls: Call[]) {
  return [...calls].sort(
    (a, b) =>
      (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name)
  )
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100))
}

function callCardStyle(zoom: number): CSSProperties {
  return {
    width: BASE_CARD_WIDTH * zoom,
    gap: 8 * zoom,
    paddingLeft: 12 * zoom,
    paddingRight: 12 * zoom,
    paddingTop: 10 * zoom,
    paddingBottom: 10 * zoom,
    fontSize: 14 * zoom,
    borderRadius: CARD_RADIUS * zoom,
  }
}

function cornerFanStyle(
  zoom: number,
  angleDeg: number,
  buttonSize: number
): CSSProperties {
  const radius = CARD_RADIUS * zoom
  const edgeGap = 2 * zoom
  const orbit = radius + edgeGap + buttonSize / 2
  const rad = (angleDeg * Math.PI) / 180
  // Arc center of the top-right rounded corner, from the box's top-right.
  const x = -radius + Math.cos(rad) * orbit
  const y = radius - Math.sin(rad) * orbit
  return {
    top: y - buttonSize / 2,
    left: `calc(100% + ${x - buttonSize / 2}px)`,
  }
}

function statusDotClass(status: string | undefined) {
  if (status === "success") return "bg-[#8FD2B0] dark:bg-emerald-400/80"
  if (status === "failed") return "bg-orange-400 dark:bg-orange-400/90"
  if (status === "error") return "bg-red-500 dark:bg-red-400"
  if (status === "skipped") return "bg-muted-foreground/35"
  if (status === "running") return "bg-sky-400"
  return "bg-muted-foreground/30"
}

function statusLabel(status: string | undefined) {
  if (status === "success") return "Success"
  if (status === "failed" || status === "error") return "Failed"
  if (status === "running") return "Running"
  if (status === "skipped") return "Skipped"
  return "Never"
}

function StatusDot({
  status,
  zoom,
  className,
}: {
  status: string | undefined
  zoom: number
  className?: string
}) {
  const size = 7 * zoom
  return (
    <span
      className={cn("shrink-0 rounded-full", statusDotClass(status), className)}
      style={{ width: size, height: size }}
      title={statusLabel(status)}
      aria-label={statusLabel(status)}
    />
  )
}

function CallCardBody({ call, zoom }: { call: Call; zoom: number }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-foreground">{call.name}</p>
        <span
          className="block truncate font-normal text-muted-foreground"
          style={{ fontSize: `${12 * zoom}px` }}
        >
          <VariableText text={call.url || "—"} />
        </span>
      </div>
      <StatusDot status={call.lastStatus} zoom={zoom} className="self-center" />
    </>
  )
}

function CallHoverAction({
  label,
  zoom,
  style,
  onClick,
  destructive,
  children,
}: {
  label: string
  zoom: number
  style: CSSProperties
  onClick: () => void
  destructive?: boolean
  children: ReactNode
}) {
  const size = 20 * zoom
  const icon = 11 * zoom

  return (
    <button
      type="button"
      data-no-pan
      aria-label={label}
      title={label}
      className={cn(
        "absolute z-10 flex items-center justify-center rounded-full border bg-card shadow-sm",
        "hover:z-20",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      style={{ width: size, height: size, ...style }}
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <span style={{ width: icon, height: icon }} className="[&_svg]:size-full">
        {children}
      </span>
    </button>
  )
}

function SortableCallCard({
  call,
  zoom,
  onEdit,
  onCopy,
  onDelete,
}: {
  call: Call
  zoom: number
  onEdit: () => void
  onCopy: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: call.id })

  // Fan along the rounded top-right corner (matches the card radius).
  const size = 20 * zoom
  const actions = [
    {
      label: "Delete",
      onClick: onDelete,
      destructive: true,
      icon: <Trash2Icon />,
      style: cornerFanStyle(zoom, CORNER_FAN_ANGLES[0], size),
    },
    {
      label: "Copy",
      onClick: onCopy,
      icon: <CopyIcon />,
      style: cornerFanStyle(zoom, CORNER_FAN_ANGLES[1], size),
    },
    {
      label: "Edit",
      onClick: onEdit,
      icon: <PencilIcon />,
      style: cornerFanStyle(zoom, CORNER_FAN_ANGLES[2], size),
    },
  ] as const

  return (
    <div
      ref={setNodeRef}
      data-no-pan
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("relative", isDragging && "opacity-40")}
    >
      {actions.map((action) => (
        <CallHoverAction
          key={action.label}
          label={action.label}
          zoom={zoom}
          style={action.style}
          destructive={"destructive" in action && action.destructive}
          onClick={action.onClick}
        >
          {action.icon}
        </CallHoverAction>
      ))}
      <div
        style={callCardStyle(zoom)}
        className="flex cursor-grab touch-none items-center border bg-card font-medium shadow-sm active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <CallCardBody call={call} zoom={zoom} />
      </div>
    </div>
  )
}

function CallCardOverlay({ call, zoom }: { call: Call; zoom: number }) {
  return (
    <div
      style={callCardStyle(zoom)}
      className="flex cursor-grabbing items-center border bg-card font-medium shadow-lg ring-1 ring-foreground/10"
    >
      <CallCardBody call={call} zoom={zoom} />
    </div>
  )
}

function CanvasControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}) {
  return (
    <div
      data-no-pan
      className="absolute bottom-4 left-4 z-20 flex flex-col overflow-hidden rounded-lg border bg-card shadow-md"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 rounded-none border-b [&_svg:not([class*='size-'])]:size-5"
        aria-label="Zoom in"
        disabled={zoom >= MAX_ZOOM}
        onClick={onZoomIn}
      >
        <ZoomInIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 rounded-none border-b [&_svg:not([class*='size-'])]:size-5"
        aria-label="Zoom out"
        disabled={zoom <= MIN_ZOOM}
        onClick={onZoomOut}
      >
        <ZoomOutIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 rounded-none [&_svg:not([class*='size-'])]:size-5"
        aria-label="Fit view"
        onClick={onFit}
      >
        <Maximize2Icon />
      </Button>
    </div>
  )
}

/** Vertical sortable list of workflow calls. */
export function WorkflowCanvas({ workflowId }: { workflowId: string }) {
  const callsQuery = useCalls(workflowId)
  const reorderMutation = useReorderCalls(workflowId)
  const copyMutation = useCopyCall(workflowId)
  const deleteMutation = useDeleteCall(workflowId)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editedId, setEditedId] = useState<string | null>(null)
  const [callToDelete, setCallToDelete] = useState<Call | null>(null)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const panSessionRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)

  const orderedCalls = useMemo(
    () => sortCalls(callsQuery.data ?? []),
    [callsQuery.data]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const zoomIn = useCallback(() => {
    setZoom((value) => clampZoom(value + ZOOM_STEP))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((value) => clampZoom(value - ZOOM_STEP))
  }, [])

  const fitView = useCallback(() => {
    setZoom(DEFAULT_ZOOM)
    setPan({ x: 0, y: 0 })
  }, [])

  // React onWheel is passive — native non-passive listener blocks page scroll.
  useEffect(() => {
    const node = viewportRef.current
    if (!node) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      setZoom((value) => clampZoom(value + delta))
    }

    node.addEventListener("wheel", onWheel, { passive: false })
    return () => node.removeEventListener("wheel", onWheel)
  }, [])

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      const target = event.target as HTMLElement | null
      if (target?.closest("[data-no-pan]")) return

      panSessionRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: pan.x,
        originY: pan.y,
        moved: false,
      }
    },
    [pan.x, pan.y]
  )

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return

    const dx = event.clientX - session.startX
    const dy = event.clientY - session.startY
    if (!session.moved) {
      if (Math.hypot(dx, dy) < PAN_THRESHOLD) return
      session.moved = true
      setIsPanning(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    setPan({
      x: session.originX + dx,
      y: session.originY + dy,
    })
  }, [])

  const endPan = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return
    panSessionRef.current = null
    setIsPanning(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

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
  const empty = callsQuery.isSuccess && orderedCalls.length === 0
  const connectorHeight = 32 * zoom
  const dotSize = 16 * zoom

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

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-xl border bg-card">
      <div
        ref={viewportRef}
        className={cn(
          "h-full w-full touch-none overflow-hidden overscroll-none",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(color-mix(in oklch, var(--muted-foreground) 45%, transparent) 1.25px, transparent 1.25px)",
            backgroundSize: `${dotSize}px ${dotSize}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />
        {/* Pan via relative left/top — no CSS transform/zoom on the DnD tree. */}
        <div className="flex h-full w-full items-center justify-center">
          <div
            className="relative z-10 px-6 py-8"
            style={{ left: pan.x, top: pan.y }}
          >
            {callsQuery.isLoading ? (
              <p className="text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : callsQuery.error ? (
              <p className="text-center text-sm text-destructive">
                {callsQuery.error.message}
              </p>
            ) : empty ? (
              <p className="text-center text-sm text-muted-foreground">
                No calls yet. Add a call to see it here.
              </p>
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
                  <ul className="flex flex-col items-center">
                    {orderedCalls.map((call, index) => (
                      <li
                        key={call.id}
                        className="relative"
                        style={
                          index > 0
                            ? { paddingTop: connectorHeight }
                            : undefined
                        }
                      >
                        {index > 0 ? (
                          <div
                            aria-hidden
                            className="absolute left-1/2 w-px -translate-x-1/2 bg-muted-foreground/40"
                            style={{ top: 0, height: connectorHeight }}
                          />
                        ) : null}
                        <SortableCallCard
                          call={call}
                          zoom={zoom}
                          onEdit={() => openEdit(call.id)}
                          onCopy={() => copyMutation.mutate(call.id)}
                          onDelete={() => setCallToDelete(call)}
                        />
                      </li>
                    ))}
                  </ul>
                </SortableContext>
                <DragOverlay dropAnimation={DROP_ANIMATION}>
                  {active ? (
                    <CallCardOverlay call={active} zoom={zoom} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      </div>
      <CanvasControls
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={fitView}
      />

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
    </div>
  )
}
