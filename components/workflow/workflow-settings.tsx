"use client"

import { ExpiryItemsTable } from "@/components/expiry/expiry-items-table"
import {
  ExpiryPolicyCard,
  type ExpiryPolicyCardHandle,
} from "@/components/expiry/expiry-policy-card"
import {
  IncidentPoliciesCard,
  type IncidentPoliciesCardHandle,
} from "@/components/incident-policy/incident-policies-card"
import {
  NotificationSettingsCard,
  type NotificationSettingsCardHandle,
} from "@/components/notify-settings/notification-settings-card"
import { Separator } from "@/components/ui/separator"
import { EXPIRY_TYPES } from "@/lib/expiry/registry"
import { useWorkflow } from "@/lib/workflow/hooks"
import { forwardRef, useImperativeHandle, useRef } from "react"

export type WorkflowSettingsHandle = {
  /** Persist dirty settings sections. No-op when nothing changed. */
  save: () => Promise<void>
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <>
      <Separator className="my-10" />
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div className="space-y-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col gap-4 md:col-span-2">{children}</div>
      </div>
    </>
  )
}

export const WorkflowSettings = forwardRef<
  WorkflowSettingsHandle,
  { workflowId: string }
>(function WorkflowSettings({ workflowId }, ref) {
  const workflowQuery = useWorkflow(workflowId)
  const intervalSeconds =
    workflowQuery.data?.scheduleType === "interval"
      ? workflowQuery.data.intervalSeconds
      : undefined

  const incidentsRef = useRef<IncidentPoliciesCardHandle>(null)
  const notificationsRef = useRef<NotificationSettingsCardHandle>(null)
  const expiryRef = useRef<ExpiryPolicyCardHandle>(null)
  const tlsMeta = EXPIRY_TYPES.tls_certificate

  useImperativeHandle(ref, () => ({
    save: async () => {
      await Promise.all([
        incidentsRef.current?.save() ?? Promise.resolve(),
        notificationsRef.current?.save() ?? Promise.resolve(),
        expiryRef.current?.save() ?? Promise.resolve(),
      ])
    },
  }))

  return (
    <>
      <SettingsSection
        title="Incidents"
        description="When an incident opens and closes, by type."
      >
        <IncidentPoliciesCard
          ref={incidentsRef}
          workflowId={workflowId}
          intervalSeconds={intervalSeconds}
          hideActions
        />
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="Who receives mail for incidents and TLS certificate alerts."
      >
        <NotificationSettingsCard
          ref={notificationsRef}
          workflowId={workflowId}
          hideActions
        />
      </SettingsSection>

      <SettingsSection title={tlsMeta.title} description={tlsMeta.help}>
        <ExpiryPolicyCard
          ref={expiryRef}
          workflowId={workflowId}
          type="tls_certificate"
          hideActions
        />
        <ExpiryItemsTable workflowId={workflowId} type="tls_certificate" />
      </SettingsSection>
    </>
  )
})
