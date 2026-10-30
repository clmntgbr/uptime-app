"use client"

import { VARIABLE_TEXT_CLASS } from "@/components/variable/variable-text"
import type { AvailableVariable } from "@/lib/variable/types"
import { cn } from "@/lib/utils"

function detailLabel(variable: AvailableVariable) {
  if (variable.secret) return "••••••"
  return variable.value || variable.path || "—"
}

export function AvailableVariableRow({
  variable,
  className,
  as: Comp = "li",
}: {
  variable: AvailableVariable
  className?: string
  as?: "li" | "div"
}) {
  return (
    <Comp className={cn("flex min-w-0 items-center gap-2 px-3 py-2", className)}>
      <button
        type="button"
        className={cn("min-w-0 truncate text-start", VARIABLE_TEXT_CLASS)}
        title={variable.name}
      >
        {`{{${variable.name}}}`}
      </button>
      <span className="ms-auto min-w-0 truncate text-end text-xs text-muted-foreground">
        {detailLabel(variable)}
      </span>
    </Comp>
  )
}
