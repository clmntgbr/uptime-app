"use client"

import { Button } from "@/components/ui/button"
import { VARIABLE_TEXT_CLASS } from "@/components/variable/variable-text"
import type { AvailableVariable } from "@/lib/variable/types"
import { cn } from "@/lib/utils"
import { PencilIcon, Trash2Icon } from "lucide-react"

function detailLabel(variable: AvailableVariable) {
  if (variable.secret) return "••••••"
  return variable.value || variable.path || "—"
}

export function AvailableVariableRow({
  variable,
  className,
  onEdit,
  onDelete,
  isDeleting = false,
}: {
  variable: AvailableVariable
  className?: string
  onEdit?: () => void
  onDelete?: () => void
  isDeleting?: boolean
}) {
  const showActions = onEdit != null || onDelete != null

  return (
    <div className={cn("flex min-w-0 items-center gap-2 px-3 py-2", className)}>
      <button
        type="button"
        className={cn("min-w-0 truncate text-start", VARIABLE_TEXT_CLASS)}
        title={variable.name}
      >
        {`{{${variable.name}}}`}
      </button>
      <span className="min-w-0 flex-1 truncate text-end text-xs text-muted-foreground">
        {detailLabel(variable)}
      </span>
      {showActions ? (
        <div className="flex shrink-0 items-center gap-0.5">
          {onEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit {{${variable.name}}}`}
              onClick={onEdit}
            >
              <PencilIcon className="size-3.5" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              aria-label={`Delete {{${variable.name}}}`}
              disabled={isDeleting}
              onClick={onDelete}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
