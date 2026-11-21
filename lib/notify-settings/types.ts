export type RunNotifyMode = "every" | "transition"

export type RunNotifyStatus = "failed" | "error" | "success"

export type NotificationSettings = {
  emails: string[]
  incidentsEnabled: boolean
  tlsEnabled: boolean
  runsEnabled: boolean
  runStatuses: string[]
  runMode: RunNotifyMode | string
  updatedAt?: string
}

export type UpsertNotificationSettingsInput = {
  emails: string[]
  incidentsEnabled: boolean
  tlsEnabled: boolean
  runsEnabled: boolean
  runStatuses: string[]
  runMode: RunNotifyMode
}

export const DEFAULT_RUN_STATUSES: RunNotifyStatus[] = ["failed", "error"]

export const RUN_STATUS_OPTIONS: {
  value: RunNotifyStatus
  label: string
  description: string
}[] = [
  {
    value: "failed",
    label: "Failed",
    description: "Business failure (assertions, HTTP fail)",
  },
  {
    value: "error",
    label: "Errored",
    description: "Technical error or lease timeout",
  },
  {
    value: "success",
    label: "Success",
    description: "Run completed successfully",
  },
]

export const RUN_MODE_OPTIONS: {
  value: RunNotifyMode
  label: string
  description: string
}[] = [
  {
    value: "transition",
    label: "On change",
    description: "Only when the run status changes",
  },
  {
    value: "every",
    label: "Every time",
    description: "Each matching run",
  },
]
