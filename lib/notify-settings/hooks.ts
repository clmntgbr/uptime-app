"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import {
  getNotificationSettings,
  upsertNotificationSettings,
} from "./api"
import type { UpsertNotificationSettingsInput } from "./types"

export function useNotificationSettings(workflowId: string) {
  return useQuery({
    queryKey: queryKeys.notifySettings.detail(workflowId),
    queryFn: () => getNotificationSettings(workflowId),
  })
}

export function useUpsertNotificationSettings(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpsertNotificationSettingsInput) =>
      upsertNotificationSettings(workflowId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.notifySettings.detail(workflowId), data)
    },
  })
}
