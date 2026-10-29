"use client"

import { ContextVariablesCard } from "@/components/workflow/context-variables-card"
import { LatestRunCard } from "@/components/workflow/latest-run-card"

export function WorkflowContextColumn({
  workflowId,
}: {
  workflowId: string
}) {
  return (
    <aside className="flex w-full flex-col gap-3 min-[900px]:w-[280px] min-[900px]:shrink-0">
      <LatestRunCard workflowId={workflowId} />
      <ContextVariablesCard workflowId={workflowId} />
    </aside>
  )
}
