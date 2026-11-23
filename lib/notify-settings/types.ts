export type RunNotifyMode = "every" | "transition"

export type RunNotifyStatus = "failed" | "error" | "success"

export type NotificationSettings = {
  emails: string[]
  incidentsEnabled: boolean
  tlsEnabled: boolean
  runsEnabled: boolean
  runStatuses: string[]
  runMode: RunNotifyMode | string
  digestDaily: boolean
  digestWeekly: boolean
  digestMonthly: boolean
  updatedAt?: string
}

export type UpsertNotificationSettingsInput = {
  emails: string[]
  incidentsEnabled: boolean
  tlsEnabled: boolean
  runsEnabled: boolean
  runStatuses: string[]
  runMode: RunNotifyMode
  digestDaily: boolean
  digestWeekly: boolean
  digestMonthly: boolean
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

export const DIGEST_OPTIONS: {
  key: "digestDaily" | "digestWeekly" | "digestMonthly"
  label: string
  description: string
}[] = [
  {
    key: "digestDaily",
    label: "Daily",
    description: "Previous day · sent next morning at 08:00 UTC",
  },
  {
    key: "digestWeekly",
    label: "Weekly",
    description: "Mon–Sun · sent following Monday at 08:00 UTC",
  },
  {
    key: "digestMonthly",
    label: "Monthly",
    description: "Previous calendar month · sent on the 1st at 08:00 UTC",
  },
]
