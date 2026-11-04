/** Human-readable lines from an incident `cause` payload. */
export function formatIncidentCause(
  cause: Record<string, unknown> | undefined | null,
  callNameById?: Map<string, string>
): string[] {
  if (!cause || Object.keys(cause).length === 0) return []

  const lines: string[] = []

  const rules = cause.rules
  if (Array.isArray(rules)) {
    for (const rule of rules) {
      if (!rule || typeof rule !== "object") continue
      const row = rule as Record<string, unknown>
      const subject = typeof row.subject === "string" ? row.subject : "rule"
      const observed = row.observed
      const expected = row.expected
      if (observed != null && expected != null) {
        lines.push(
          `${formatSubject(subject)}: observed ${String(observed)}, expected ${String(expected)}`
        )
      } else if (observed != null) {
        lines.push(`${formatSubject(subject)}: observed ${String(observed)}`)
      } else {
        lines.push(formatSubject(subject))
      }
    }
  }

  if (typeof cause.status === "string") {
    lines.push(`Status: ${cause.status}`)
  }
  if (typeof cause.reason === "string" && cause.reason) {
    lines.push(`Reason: ${cause.reason}`)
  }
  if (typeof cause.producerCallId === "string") {
    const name =
      callNameById?.get(cause.producerCallId) ?? cause.producerCallId
    lines.push(`Blocked by: ${name}`)
  }
  if (typeof cause.subject === "string") {
    lines.push(`Host: ${cause.subject}`)
  }
  if (cause.daysLeft != null) {
    lines.push(`Days left: ${String(cause.daysLeft)}`)
  }
  if (cause.threshold != null) {
    lines.push(`Threshold: ${String(cause.threshold)}`)
  }
  if (cause.rate != null) {
    const rate =
      typeof cause.rate === "number"
        ? `${(cause.rate * 100).toFixed(1)}%`
        : String(cause.rate)
    lines.push(`Availability: ${rate}`)
  }

  if (lines.length === 0) {
    for (const [key, value] of Object.entries(cause)) {
      if (value == null || typeof value === "object") continue
      lines.push(`${key}: ${String(value)}`)
    }
  }

  return lines
}

function formatSubject(subject: string) {
  if (subject === "response_time") return "Response time"
  if (subject === "status") return "Status"
  return subject.replaceAll("_", " ")
}
