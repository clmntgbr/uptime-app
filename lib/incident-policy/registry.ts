import type { IncidentKind } from "@/lib/incident/types"
import type { IncidentPolicy, IncidentProfile } from "./types"

export const INCIDENT_KIND_ORDER: IncidentKind[] = [
  "call_failed",
  "workflow_failed",
  "call_slow",
  "chain_broken",
  "availability_low",
  "no_run",
  "tls_expiry",
]

export const INCIDENT_POLICY_LABELS: Record<IncidentKind, string> = {
  call_failed: "Call failing",
  workflow_failed: "Workflow failing",
  call_slow: "Call slow",
  chain_broken: "Chain broken (missing variable)",
  availability_low: "Low availability",
  no_run: "No run",
  tls_expiry: "TLS certificate expiry",
}

/** Kinds that show Open after / Close after counters. */
export const RUN_BASED_KINDS: IncidentKind[] = [
  "call_failed",
  "workflow_failed",
  "call_slow",
  "chain_broken",
]

export const INCIDENT_PROFILES: IncidentProfile[] = [
  { id: "strict", label: "Strict", openAfter: 1, closeAfter: 2 },
  { id: "recommended", label: "Recommended", openAfter: 3, closeAfter: 2 },
  { id: "calm", label: "Calm", openAfter: 5, closeAfter: 3 },
]

export const SEVERITY_OPTIONS: { value: IncidentPolicy["severity"]; label: string }[] = [
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
]

export function isRunBasedKind(kind: IncidentKind): boolean {
  return RUN_BASED_KINDS.includes(kind)
}

export function showsOpenClose(kind: IncidentKind): boolean {
  return isRunBasedKind(kind)
}

export function kindHelp(kind: IncidentKind): string | null {
  switch (kind) {
    case "call_slow":
      return "Needs a response-time rule on a call."
    case "tls_expiry":
      return "Day thresholds are configured in the certificate card below."
    default:
      return null
  }
}

export function estimateRunsHint(
  count: number,
  intervalSeconds: number | undefined,
  mode: "open" | "close"
): string {
  if (mode === "open" && count === 1) {
    return "As soon as a run fails"
  }
  if (mode === "close" && count === 1) {
    return "As soon as a run succeeds"
  }
  if (!intervalSeconds || intervalSeconds <= 0) {
    return `${count} consecutive runs`
  }
  const everyMin = Math.max(1, Math.round(intervalSeconds / 60))
  const totalMin = count * everyMin
  const unit = totalMin === 1 ? "min" : "min"
  return `≈ ${totalMin} ${unit} at your current interval (every ${everyMin} min)`
}

export function detectProfile(
  policies: Pick<IncidentPolicy, "kind" | "openAfter" | "closeAfter">[]
): IncidentProfile["id"] | "custom" {
  for (const profile of INCIDENT_PROFILES) {
    const match = RUN_BASED_KINDS.every((kind) => {
      const row = policies.find((p) => p.kind === kind)
      if (!row) return false
      return row.openAfter === profile.openAfter && row.closeAfter === profile.closeAfter
    })
    if (match) return profile.id
  }
  return "custom"
}

export function applyProfile(
  policies: IncidentPolicy[],
  profile: IncidentProfile
): IncidentPolicy[] {
  return policies.map((p) => {
    if (!isRunBasedKind(p.kind)) return p
    return { ...p, openAfter: profile.openAfter, closeAfter: profile.closeAfter }
  })
}

export function normalizePolicyParams(
  kind: IncidentKind,
  params: IncidentPolicy["params"]
): IncidentPolicy["params"] {
  switch (kind) {
    case "availability_low":
      return {
        threshold: Number(params.threshold ?? 99),
        recoveryThreshold: Number(params.recoveryThreshold ?? 99.5),
      }
    case "no_run":
      return { multiplier: Number(params.multiplier ?? 3) }
    default:
      return {}
  }
}
