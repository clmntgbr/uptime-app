export type NotificationSettings = {
  emails: string[]
  incidentsEnabled: boolean
  tlsEnabled: boolean
  updatedAt?: string
}

export type UpsertNotificationSettingsInput = {
  emails: string[]
  incidentsEnabled: boolean
  tlsEnabled: boolean
}
