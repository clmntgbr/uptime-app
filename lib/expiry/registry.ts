import type { ExpiryItem, ExpiryType } from "./types"

export const EXPIRY_TYPES: Record<
  ExpiryType,
  {
    title: string
    help: string
    subjectLabel: string
    rowLabel: (item: ExpiryItem) => string
  }
> = {
  tls_certificate: {
    title: "Certificate expiry alerts",
    help: "Get notified before the TLS certificates used by this workflow's calls expire.",
    subjectLabel: "Host",
    rowLabel: (item) => `TLS certificate · ${item.subject.split(":")[0]}`,
  },
}

export const EXPIRY_SHORTCUTS = [60, 30, 14, 7, 3, 1] as const

export const EXPIRY_MAX_THRESHOLDS = 20
