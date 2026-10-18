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
