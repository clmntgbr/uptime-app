/** Cascade bar placement for one call on the latest-run track. Min width 2%. */
export function cascadeBarStyle(
  offsetMs: number,
  durationMs: number,
  runDurationMs: number
): { left: string; width: string } {
  const total = Math.max(runDurationMs, 1)
  const leftPct = Math.max(0, Math.min(100, (offsetMs / total) * 100))
  const rawWidth = Math.max((durationMs / total) * 100, 2)
  const widthPct = Math.min(rawWidth, Math.max(0, 100 - leftPct))
  return {
    left: `${leftPct}%`,
    width: `${widthPct}%`,
  }
}
