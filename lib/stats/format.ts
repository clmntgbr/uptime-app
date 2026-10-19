export function formatRate(rate: number) {
  return `${(rate * 100).toFixed(rate > 0 && rate < 0.01 ? 1 : 0)}%`
}

export function formatLatencyMs(ms: number | null | undefined) {
  if (ms == null) return "—"
  if (ms >= 1000) {
    const seconds = ms / 1000
    return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`
  }
  return `${Math.round(ms)}ms`
}

/** Relative time like "3 min ago" / "just now". */
export function formatRelativeTime(iso: string | undefined | null): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"

  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`

  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function formatRunStatusLabel(status: string | undefined | null): string {
  switch (status) {
    case "success":
      return "Success"
    case "failed":
      return "Failed"
    case "error":
      return "Error"
    case "skipped":
      return "Skipped"
    case "running":
      return "Running"
    default:
      return status ? status : "Never"
  }
}
