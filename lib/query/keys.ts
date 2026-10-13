export const queryKeys = {
  user: {
    all: ["user"] as const,
    me: ["user", "me"] as const,
  },
} as const
