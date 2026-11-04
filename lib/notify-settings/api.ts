import { parseApiError } from "@/lib/api-error"
import type {
  NotificationSettings,
  UpsertNotificationSettingsInput,
} from "./types"

export const getNotificationSettings = async (
  workflowId: string
): Promise<NotificationSettings> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/notification-settings`,
    { method: "GET", cache: "no-store" }
  )
  if (!response.ok) {
    throw await parseApiError(response, "Failed to load notification settings")
  }
  return response.json()
}

export const upsertNotificationSettings = async (
  workflowId: string,
  input: UpsertNotificationSettingsInput
): Promise<NotificationSettings> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/notification-settings`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
  if (!response.ok) {
    throw await parseApiError(response, "Failed to save notification settings")
  }
  return response.json()
}
