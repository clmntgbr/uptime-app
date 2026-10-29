"use client"

import { ExpiryItemsTable } from "@/components/expiry/expiry-items-table"
import { ExpiryPolicyCard } from "@/components/expiry/expiry-policy-card"

export function WorkflowSettings({ workflowId }: { workflowId: string }) {
  return (
    <div className="flex flex-col gap-4">
      <ExpiryPolicyCard workflowId={workflowId} type="tls_certificate" />
      <ExpiryItemsTable workflowId={workflowId} type="tls_certificate" />
    </div>
  )
}
