"use client"

import { DashboardStats } from "@/components/stats/dashboard-stats"
import { Button } from "@/components/ui/button"
import { GlobalVariables } from "@/components/variable/global-variables"
import { WorkflowDrawer } from "@/components/workflow/workflow-drawer"
import { useDeleteWorkflow, useWorkflows } from "@/lib/workflow/hooks"
import Link from "next/link"
import { useState } from "react"

const PAGE_LIMIT = 20

export default function Page() {
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editedId, setEditedId] = useState<string | null>(null)

  const workflowsQuery = useWorkflows({ page, limit: PAGE_LIMIT })
  const deleteMutation = useDeleteWorkflow()

  const data = workflowsQuery.data
  const totalPages = Math.max(data?.totalPages ?? 1, 1)

  const openCreate = () => {
    setEditedId(null)
    setDrawerOpen(true)
  }

  const openEdit = (id: string) => {
    setEditedId(id)
    setDrawerOpen(true)
  }

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete workflow "${name}"?`)) return
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (data?.members.length === 1 && page > 1) setPage(page - 1)
      },
    })
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <DashboardStats />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Workflows</h1>
        <Button onClick={openCreate}>New workflow</Button>
      </div>

      {workflowsQuery.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : workflowsQuery.error ? (
        <p className="text-destructive">{workflowsQuery.error.message}</p>
      ) : !data?.members.length ? (
        <p className="text-muted-foreground">No workflows yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {data.members.map((workflow) => (
            <li
              key={workflow.id}
              className="flex items-center justify-between gap-2 px-4 py-2"
            >
              <Link
                href={`/workflows/${workflow.id}`}
                className="truncate hover:underline"
              >
                {workflow.name}
              </Link>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(workflow.id)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={
                    deleteMutation.isPending &&
                    deleteMutation.variables === workflow.id
                  }
                  onClick={() => handleDelete(workflow.id, workflow.name)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleteMutation.error && (
        <p className="text-destructive">{deleteMutation.error.message}</p>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} / {totalPages} · {data.total} workflows
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <WorkflowDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        workflowId={editedId}
      />

      <GlobalVariables />
    </div>
  )
}
