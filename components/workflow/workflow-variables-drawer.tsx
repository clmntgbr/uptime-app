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
import { CallVariableDrawer } from "@/components/variable/call-variables"
import { GlobalVariableDrawer } from "@/components/variable/global-variables"
import { StaticVariableDrawer } from "@/components/variable/static-variable-drawer"
import { ApiError } from "@/lib/api-error"
import { useCalls } from "@/lib/call/hooks"
import { queryKeys } from "@/lib/query/keys"
import { deleteCallVariable, listCallVariables } from "@/lib/variable/api"
import {
  useDeleteGlobalVariable,
  useDeleteStaticVariable,
  useGlobalVariables,
  useStaticVariables,
} from "@/lib/variable/hooks"
import type { AvailableVariable } from "@/lib/variable/types"
import {
  groupWorkflowVariables,
  type WorkflowVariableGroup,
} from "@/lib/variable/workflow-variables"
import { useQueries, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

type EditTarget =
  | { type: "global"; id: string }
  | { type: "static"; name: string }
  | { type: "call"; callId: string; name: string }

function formatDeleteError(error: Error) {
  return error instanceof ApiError && error.code === "VARIABLE_IN_USE"
    ? "This variable is in use and cannot be deleted."
    : error.message
}

function VariableGroup({
  group,
  globalsByName,
  onEdit,
  onDelete,
  deletingKey,
}: {
  group: WorkflowVariableGroup
  globalsByName: Map<string, string>
  onEdit: (variable: AvailableVariable) => void
  onDelete: (variable: AvailableVariable) => void
  deletingKey: string | null
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{group.label}</h3>
      <div className="divide-y rounded-md border bg-card">
        {group.variables.map((variable) => {
          const key = `${variable.type}:${variable.callId}:${variable.name}`
          const canEdit =
            variable.type !== "global" || globalsByName.has(variable.name)
          return (
            <AvailableVariableRow
              key={key}
              variable={variable}
              onEdit={canEdit ? () => onEdit(variable) : undefined}
              onDelete={canEdit ? () => onDelete(variable) : undefined}
              isDeleting={deletingKey === key}
            />
          )
        })}
      </div>
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

  const globalsByName = useMemo(() => {
    const map = new Map<string, string>()
    for (const variable of globalsQuery.data ?? []) {
      map.set(variable.name, variable.id)
    }
    return map
  }, [globalsQuery.data])

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
    globalsByName,
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
  const { variables, globalsByName, isLoading, error, refetch } =
    useWorkflowAvailableVariables(workflowId, open)
  const groups = groupWorkflowVariables(variables)

  const queryClient = useQueryClient()
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  const deleteGlobal = useDeleteGlobalVariable()
  const deleteStatic = useDeleteStaticVariable(workflowId)

  const handleEdit = (variable: AvailableVariable) => {
    setDeleteError(null)
    if (variable.type === "global") {
      const id = globalsByName.get(variable.name)
      if (!id) return
      setEditTarget({ type: "global", id })
      return
    }
    if (variable.type === "static") {
      setEditTarget({ type: "static", name: variable.name })
      return
    }
    setEditTarget({
      type: "call",
      callId: variable.callId,
      name: variable.name,
    })
  }

  const handleDelete = async (variable: AvailableVariable) => {
    if (!window.confirm(`Delete variable "${variable.name}"?`)) return
    const key = `${variable.type}:${variable.callId}:${variable.name}`
    setDeleteError(null)
    setDeletingKey(key)
    try {
      if (variable.type === "global") {
        const id = globalsByName.get(variable.name)
        if (!id) return
        await deleteGlobal.mutateAsync(id)
      } else if (variable.type === "static") {
        await deleteStatic.mutateAsync(variable.name)
      } else {
        await deleteCallVariable(workflowId, variable.callId, variable.name)
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.callVariables.all(workflowId, variable.callId),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.availableVariables.all,
          }),
        ])
      }
    } catch (err) {
      setDeleteError(
        formatDeleteError(err instanceof Error ? err : new Error("Delete failed"))
      )
    } finally {
      setDeletingKey(null)
    }
  }

  return (
    <>
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
                No variables yet. Add globals, statics, or call extractions to
                see them here.
              </p>
            ) : (
              groups.map((group) => (
                <VariableGroup
                  key={group.key}
                  group={group}
                  globalsByName={globalsByName}
                  onEdit={handleEdit}
                  onDelete={(variable) => void handleDelete(variable)}
                  deletingKey={deletingKey}
                />
              ))
            )}
            {deleteError ? (
              <p className="text-sm text-destructive">{deleteError}</p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <GlobalVariableDrawer
        open={editTarget?.type === "global"}
        onOpenChange={(next) => {
          if (!next) setEditTarget(null)
        }}
        variableId={editTarget?.type === "global" ? editTarget.id : null}
      />

      <StaticVariableDrawer
        workflowId={workflowId}
        open={editTarget?.type === "static"}
        onOpenChange={(next) => {
          if (!next) setEditTarget(null)
        }}
        variableName={editTarget?.type === "static" ? editTarget.name : null}
      />

      {editTarget?.type === "call" ? (
        <CallVariableDrawer
          workflowId={workflowId}
          callId={editTarget.callId}
          open
          onOpenChange={(next) => {
            if (!next) setEditTarget(null)
          }}
          variableName={editTarget.name}
        />
      ) : null}
    </>
  )
}
