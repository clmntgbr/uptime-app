"use client"

import { ExpiryItemsTable } from "@/components/expiry/expiry-items-table"
import { ExpiryPolicyCard } from "@/components/expiry/expiry-policy-card"
import { IncidentPoliciesCard } from "@/components/incident-policy/incident-policies-card"
import { NotificationSettingsCard } from "@/components/notify-settings/notification-settings-card"
import { useWorkflow } from "@/lib/workflow/hooks"

export function WorkflowSettings({ workflowId }: { workflowId: string }) {
  const workflowQuery = useWorkflow(workflowId)
  const intervalSeconds =
    workflowQuery.data?.scheduleType === "interval"
      ? workflowQuery.data.intervalSeconds
      : undefined

  return (
    <div className="flex flex-col gap-4">
      <IncidentPoliciesCard
        workflowId={workflowId}
        intervalSeconds={intervalSeconds}
      />
      <NotificationSettingsCard workflowId={workflowId} />
      <ExpiryPolicyCard workflowId={workflowId} type="tls_certificate" />
      <ExpiryItemsTable workflowId={workflowId} type="tls_certificate" />
    </div>
  )
}
