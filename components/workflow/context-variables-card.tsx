"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useContextVariables } from "@/lib/context/hooks"
import type { ContextVariable } from "@/lib/context/types"
import { toast } from "sonner"
import { useId } from "react"

function scopeLabel(scope: ContextVariable["scope"]) {
  switch (scope) {
    case "global":
      return "Global"
    case "static":
      return "Static"
    case "workflow":
      return "Workflow"
  }
}

function displayValue(variable: ContextVariable) {
  if (variable.secret) return "••••••"
  if (variable.scope === "workflow" && variable.status === "missing") return "—"
  if (variable.value == null || variable.value === "") return "—"
  return variable.value
}

async function copyValue(variable: ContextVariable) {
  const text = displayValue(variable)
  if (text === "—" || text === "••••••") return
  try {
    await navigator.clipboard.writeText(variable.value ?? text)
    toast.success(`Copied {{${variable.name}}}`)
  } catch {
    toast.error("Could not copy value")
  }
}

function VariableRow({ variable }: { variable: ContextVariable }) {
  const value = displayValue(variable)
  const canCopy = value !== "—" && value !== "••••••"

  return (
    <div className="flex min-w-0 items-center gap-2 py-1.5">
      <Badge variant="outline" className="shrink-0">
        {scopeLabel(variable.scope)}
      </Badge>
      <code className="shrink-0 font-mono text-[0.6875rem] text-foreground">
        {variable.name}
      </code>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={!canCopy}
            onClick={() => void copyValue(variable)}
            className="min-w-0 flex-1 truncate text-end text-muted-foreground enabled:hover:text-foreground disabled:cursor-default"
          >
            {value}
            {variable.truncated && value !== "—" ? "…" : null}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-64">
          {variable.secret
            ? "Secret · value hidden"
            : variable.scope === "workflow" && variable.status === "missing"
              ? "Missing · producer was skipped"
              : variable.value ?? "—"}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export function ContextVariablesCard({
  workflowId,
}: {
  workflowId: string
}) {
  const titleId = useId()
  const query = useContextVariables(workflowId)

  return (
    <Card
      size="sm"
      className="bg-white"
      role="region"
      aria-labelledby={titleId}
    >
      <CardHeader className="border-b">
        <CardTitle id={titleId}>Variables</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-4/5" />
          </div>
        ) : query.error ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-destructive">{query.error.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : !query.data?.variables.length ? (
          <p className="text-muted-foreground">No variables</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {query.data.variables.map((variable) => (
              <li key={`${variable.scope}:${variable.name}`}>
                <VariableRow variable={variable} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
