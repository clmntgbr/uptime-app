"use client"

import { CallDrawer } from "@/components/call/call-drawer"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCalls, useDeleteCall } from "@/lib/call/hooks"
import type { Call } from "@/lib/call/types"
import { queryKeys } from "@/lib/query/keys"
import { formatRunStatusLabel } from "@/lib/stats/format"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowRightIcon, XIcon } from "lucide-react"
import { useMemo, useState } from "react"

const EMPTY_CALLS: Call[] = []

function reorder<T>(list: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return list
  }
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function methodShortLabel(method: string | undefined) {
  switch ((method ?? "").toUpperCase()) {
    case "DELETE":
      return "DEL"
    case "OPTIONS":
      return "OPT"
    default:
      return (method ?? "?").toUpperCase()
  }
}

function methodMediaClass(method: string | undefined) {
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

function statusBadgeClass(status: string | undefined) {
  if (status === "failed" || status === "error") {
    return "border-transparent bg-destructive/15 text-destructive"
  }
  if (status === "success") {
    return "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
  }
  if (status === "running") {
    return "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-400"
  }
  return undefined
}

function mergeCallOrder(serverIds: string[], localOrder: string[] | null) {
  if (!localOrder) return serverIds
  const next = localOrder.filter((id) => serverIds.includes(id))
  for (const id of serverIds) {
    if (!next.includes(id)) next.push(id)
  }
  return next
}

export function CallList({ workflowId }: { workflowId: string }) {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editedId, setEditedId] = useState<string | null>(null)
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const callsQuery = useCalls(workflowId)
  const deleteMutation = useDeleteCall(workflowId)

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

  const moveCall = (fromId: string, toId: string) => {
    if (fromId === toId) return
    const currentIds = orderedCalls.map((call) => call.id)
    const from = currentIds.indexOf(fromId)
    const to = currentIds.indexOf(toId)
    if (from < 0 || to < 0) return
    const next = reorder(currentIds, from, to)
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

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Calls</h2>
        <Button size="sm" onClick={openCreate}>
          New call
        </Button>
      </div>

      {callsQuery.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : callsQuery.error ? (
        <p className="text-destructive">{callsQuery.error.message}</p>
      ) : !orderedCalls.length ? (
        <p className="text-muted-foreground">No calls yet.</p>
      ) : (
        <AttachmentGroup className="items-center gap-0" role="list">
          {orderedCalls.map((call, index) => {
            const method = (call.method ?? "?").toUpperCase()
            return (
              <div
                key={call.id}
                className="flex shrink-0 snap-start items-center"
                role="listitem"
              >
                {index > 0 && (
                  <div
                    className="flex shrink-0 items-center px-1.5 text-muted-foreground"
                    aria-hidden
                  >
                    <span className="h-px w-4 bg-border" />
                    <ArrowRightIcon className="size-3.5" />
                    <span className="h-px w-4 bg-border" />
                  </div>
                )}
                <Attachment
                  state="idle"
                  className={
                    draggingId === call.id
                      ? "w-64 max-w-64 cursor-grabbing opacity-60 ring-1 ring-ring"
                      : "w-64 max-w-64 cursor-grab"
                  }
                  draggable
                  onDragStart={(event) => {
                    setDraggingId(call.id)
                    event.dataTransfer.effectAllowed = "move"
                    event.dataTransfer.setData("text/call-id", call.id)
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  onDragOver={(event) => {
                    if (
                      !Array.from(event.dataTransfer.types).includes(
                        "text/call-id"
                      )
                    ) {
                      return
                    }
                    event.preventDefault()
                    event.dataTransfer.dropEffect = "move"
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const fromId = event.dataTransfer.getData("text/call-id")
                    if (fromId) moveCall(fromId, call.id)
                    setDraggingId(null)
                  }}
                >
                  <AttachmentTrigger
                    aria-label={`Edit ${call.name}`}
                    onClick={() => openEdit(call.id)}
                  />
                  <AttachmentMedia
                    title={method}
                    aria-label={method}
                    className={`px-0.5 text-center text-[0.625rem] leading-none font-semibold ${methodMediaClass(call.method)}`}
                  >
                    {methodShortLabel(call.method)}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <AttachmentTitle className="flex-1">
                        {call.name}
                      </AttachmentTitle>
                      {call.lastStatus && (
                        <Badge
                          variant="outline"
                          className={`shrink-0 ${statusBadgeClass(call.lastStatus) ?? ""}`}
                        >
                          {call.lastHttpStatus != null
                            ? `${formatRunStatusLabel(call.lastStatus)} · ${call.lastHttpStatus}`
                            : formatRunStatusLabel(call.lastStatus)}
                        </Badge>
                      )}
                    </div>
                    <AttachmentDescription title={call.url}>
                      {call.url || "—"}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={`Delete ${call.name}`}
                      disabled={
                        deleteMutation.isPending &&
                        deleteMutation.variables === call.id
                      }
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDelete(call.id, call.name)
                      }}
                    >
                      <XIcon />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              </div>
            )
          })}
        </AttachmentGroup>
      )}

      {deleteMutation.error && (
        <p className="text-destructive">{deleteMutation.error.message}</p>
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
