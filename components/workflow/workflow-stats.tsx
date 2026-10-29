"use client"

import { DashboardStats } from "@/components/stats/dashboard-stats"

export function WorkflowStats({
  workflowId,
  lastRunAt,
  lastStatus,
  isRunning = false,
}: {
  workflowId: string
  lastRunAt?: string
  lastStatus?: string
  isRunning?: boolean
}) {
  return (
    <DashboardStats
      workflowId={workflowId}
      lastRunAt={lastRunAt}
      lastStatus={lastStatus}
      isRunning={isRunning}
      showCharts={false}
    />
  )
}
