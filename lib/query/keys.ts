import { PaginateParams } from "@/lib/paginate"

export const queryKeys = {
  user: {
    all: ["user"] as const,
    me: ["user", "me"] as const,
  },

  workflows: {
    all: ["workflows"] as const,
    lists: () => [...queryKeys.workflows.all, "list"] as const,
    list: (params?: PaginateParams) =>
      [...queryKeys.workflows.lists(), params ?? {}] as const,
    detail: (id: string) => [...queryKeys.workflows.all, id] as const,
  },
} as const
