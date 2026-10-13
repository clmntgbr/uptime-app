"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import { getUser } from "./api"

export function useUser() {
  const query = useQuery({
    queryKey: queryKeys.user.me,
    queryFn: getUser,
  })

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  }
}
