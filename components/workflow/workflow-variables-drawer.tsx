"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { AvailableVariableRow } from "@/components/variable/available-variable-row"
import { useCalls } from "@/lib/call/hooks"
import { queryKeys } from "@/lib/query/keys"
import { listCallVariables } from "@/lib/variable/api"
import {
  useGlobalVariables,
  useStaticVariables,
} from "@/lib/variable/hooks"
import type { AvailableVariable } from "@/lib/variable/types"
import {
  groupWorkflowVariables,
  type WorkflowVariableGroup,
} from "@/lib/variable/workflow-variables"
import { useQueries } from "@tanstack/react-query"
import { useMemo } from "react"

function VariableGroup({ group }: { group: WorkflowVariableGroup }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{group.label}</h3>
      <ul className="divide-y rounded-md border bg-card">
        {group.variables.map((variable) => (
          <AvailableVariableRow
            key={`${variable.type}-${variable.name}-${
              variable.type === "call" ? variable.callId : ""
            }`}
            variable={variable}
          />
        ))}
      </ul>
    </section>
  )
}

function useWorkflowAvailableVariables(workflowId: string, enabled: boolean) {
  const globalsQuery = useGlobalVariables()
  const staticsQuery = useStaticVariables(workflowId)
  const callsQuery = useCalls(workflowId)

  const calls = enabled ? (callsQuery.data ?? []) : []
  const callVariableQueries = useQueries({
    queries: calls.map((call) => ({
      queryKey: queryKeys.callVariables.list(workflowId, call.id),
      queryFn: () => listCallVariables(workflowId, call.id),
      enabled,
    })),
  })

  const callVariablesData = callVariableQueries.map((query) => query.data)
  const callVariablesLoading = callVariableQueries.some((query) => query.isLoading)
  const callVariablesError =
    callVariableQueries.find((query) => query.error)?.error ?? null

  const isLoading =
    enabled &&
    (globalsQuery.isLoading ||
      staticsQuery.isLoading ||
      callsQuery.isLoading ||
      callVariablesLoading)

  const error =
    globalsQuery.error ??
    staticsQuery.error ??
    callsQuery.error ??
    callVariablesError

  const variables = useMemo((): AvailableVariable[] => {
    if (!enabled) return []
    const list: AvailableVariable[] = [
      ...(globalsQuery.data ?? []).map((variable) => ({
        name: variable.name,
        type: "global" as const,
        path: "",
        source: "",
        callId: "",
        callName: "",
        secret: variable.secret ?? false,
        value: variable.value,
      })),
      ...(staticsQuery.data ?? []).map((variable) => ({
        name: variable.name,
        type: "static" as const,
        path: "",
        source: "",
        callId: "",
        callName: "",
        secret: variable.secret ?? false,
        value: variable.value,
      })),
    ]
    calls.forEach((call, index) => {
      for (const variable of callVariablesData[index] ?? []) {
        list.push({
          name: variable.name,
          type: "call",
          path: variable.path ?? "",
          source: variable.source,
          callId: call.id,
          callName: call.name,
          secret: variable.secret ?? false,
          value: "",
        })
      }
    })
    return list
  }, [enabled, globalsQuery.data, staticsQuery.data, calls, callVariablesData])

  return {
    variables,
    isLoading,
    error,
    refetch: () => {
      void globalsQuery.refetch()
      void staticsQuery.refetch()
      void callsQuery.refetch()
      for (const query of callVariableQueries) void query.refetch()
    },
  }
}

export function WorkflowVariablesDrawer({
  open,
  onOpenChange,
  workflowId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
}) {
  const { variables, isLoading, error, refetch } = useWorkflowAvailableVariables(
    workflowId,
    open
  )
  const groups = groupWorkflowVariables(variables)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Variables</SheetTitle>
          <SheetDescription>
            Global, static, and call variables available in this workflow.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-destructive">{error.message}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No variables yet. Add globals, statics, or call extractions to see
              them here.
            </p>
          ) : (
            groups.map((group) => (
              <VariableGroup key={group.key} group={group} />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
