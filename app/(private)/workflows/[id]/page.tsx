"use client"

import { Button } from "@/components/ui/button"
import { WorkflowDrawer } from "@/components/workflow/workflow-drawer"
import { useDeleteWorkflow, useWorkflow } from "@/lib/workflow/hooks"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—"
}

export default function WorkflowPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const workflowQuery = useWorkflow(id)
  const deleteMutation = useDeleteWorkflow()

  const handleDelete = () => {
    const workflow = workflowQuery.data
    if (!workflow || !window.confirm(`Delete workflow "${workflow.name}"?`)) {
      return
    }
    deleteMutation.mutate(workflow.id, { onSuccess: () => router.push("/") })
  }

  if (workflowQuery.isLoading) {
    return <p className="text-muted-foreground">Loading…</p>
  }

  if (workflowQuery.error || !workflowQuery.data) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-destructive">
          {workflowQuery.error?.message ?? "Workflow not found"}
        </p>
        <Link href="/" className="hover:underline">
          ← Back to workflows
        </Link>
      </div>
    )
  }

  const workflow = workflowQuery.data

  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="text-muted-foreground hover:underline">
        ← Back to workflows
      </Link>

      <div className="flex items-center justify-between gap-2">
        <h1 className="truncate text-lg font-semibold">{workflow.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDrawerOpen(true)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {deleteMutation.error && (
        <p className="text-destructive">{deleteMutation.error.message}</p>
      )}

      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
        <dt className="text-muted-foreground">Interval</dt>
        <dd>{workflow.intervalSeconds}s</dd>
        <dt className="text-muted-foreground">Enabled</dt>
        <dd>{workflow.enabled ? "Yes" : "No"}</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd>{workflow.status ?? "—"}</dd>
        <dt className="text-muted-foreground">Last status</dt>
        <dd>{workflow.lastStatus ?? "—"}</dd>
        <dt className="text-muted-foreground">Last run</dt>
        <dd>{formatDate(workflow.lastRunAt)}</dd>
        <dt className="text-muted-foreground">Next run</dt>
        <dd>{formatDate(workflow.nextRunAt)}</dd>
        <dt className="text-muted-foreground">Created</dt>
        <dd>{formatDate(workflow.createdAt)}</dd>
        <dt className="text-muted-foreground">Updated</dt>
        <dd>{formatDate(workflow.updatedAt)}</dd>
      </dl>

      <WorkflowDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        workflowId={workflow.id}
      />
    </div>
  )
}
