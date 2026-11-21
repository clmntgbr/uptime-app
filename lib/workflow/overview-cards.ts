/** Shared preview size for Last run / Activity / Incidents overview cards. */
export const OVERVIEW_PREVIEW_LIMIT = 5

/**
 * Fixed list shell so the three cards share the same content height
 * (5 rows × min-h-14).
 */
export const OVERVIEW_LIST_CLASS = "flex min-h-[17.5rem] flex-col"

/** Outer shell for each preview row — same height across all three cards. */
export const OVERVIEW_ROW_CLASS =
  "min-h-14 border-b border-border/60 py-2.5 last:border-0 last:pb-0 first:pt-0"
