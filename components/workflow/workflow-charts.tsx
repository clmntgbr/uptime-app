"use client"

import { DashboardCharts } from "@/components/stats/dashboard-stats"

export function WorkflowCharts({ workflowId }: { workflowId: string }) {
  return <DashboardCharts workflowId={workflowId} />
}
