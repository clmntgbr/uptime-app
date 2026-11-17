"use client"

import { methodClass } from "@/lib/call/method-style"
import { LIBRARY_ITEM_MIME, type LibraryItemSummary } from "@/lib/library/types"
import { cn } from "@/lib/utils"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import type { DragEvent } from "react"

interface LibraryItemCardProps {
  item: LibraryItemSummary
  onEdit: () => void
  onDelete: () => void
  /** Shown only when a workflow is open; adds the item to its end. */
  onAddToWorkflow?: () => void
  addPending?: boolean
}

/** Compact version of the canvas call card: draggable onto the workflow canvas. */
export function LibraryItemCard({
  item,
  onEdit,
  onDelete,
  onAddToWorkflow,
  addPending = false,
}: LibraryItemCardProps) {
  const method = (item.method ?? "GET").toUpperCase()

  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(LIBRARY_ITEM_MIME, item.id)
    event.dataTransfer.setData("text/plain", item.name)
    event.dataTransfer.effectAllowed = "copy"
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group/library relative cursor-grab rounded-lg border bg-card p-2 shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-center gap-2">
        <span
          title={method}
          className={cn(
            "inline-flex h-5 w-10 shrink-0 items-center justify-center rounded font-mono text-[10px] font-semibold",
            methodClass(item.method)
          )}
        >
          {method}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {item.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {item.url || "—"}
          </p>
        </div>
      </div>

      <div className="absolute end-1 top-1 flex gap-1 opacity-0 transition-opacity group-focus-within/library:opacity-100 group-hover/library:opacity-100">
        {onAddToWorkflow ? (
          <button
            type="button"
            aria-label={`Add ${item.name} to this workflow`}
            title="Add to this workflow"
            disabled={addPending}
            className="flex size-5 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground disabled:opacity-50"
            onClick={(event) => {
              event.stopPropagation()
              onAddToWorkflow()
            }}
          >
            <PlusIcon className="size-2.5" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label={`Edit ${item.name}`}
          title="Edit"
          className="flex size-5 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
          onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
        >
          <PencilIcon className="size-2.5" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${item.name}`}
          title="Delete"
          className="flex size-5 items-center justify-center rounded-full border bg-card text-destructive shadow-sm hover:bg-destructive/10"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Trash2Icon className="size-2.5" />
        </button>
      </div>
    </div>
  )
}
