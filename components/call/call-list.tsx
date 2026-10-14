"use client"

import { CallDrawer } from "@/components/call/call-drawer"
import { Button } from "@/components/ui/button"
import { useCalls, useDeleteCall } from "@/lib/call/hooks"
import { useState } from "react"

export function CallList({ workflowId }: { workflowId: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editedId, setEditedId] = useState<string | null>(null)

  const callsQuery = useCalls(workflowId)
  const deleteMutation = useDeleteCall(workflowId)

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
      ) : !callsQuery.data?.length ? (
        <p className="text-muted-foreground">No calls yet.</p>
      ) : (
        <ol className="divide-y rounded-md border">
          {callsQuery.data.map((call, index) => (
            <li
              key={call.id}
              className="flex items-center justify-between gap-2 px-4 py-2"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="w-5 text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <span className="truncate">{call.name}</span>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(call.id)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={
                    deleteMutation.isPending &&
                    deleteMutation.variables === call.id
                  }
                  onClick={() => handleDelete(call.id, call.name)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ol>
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
