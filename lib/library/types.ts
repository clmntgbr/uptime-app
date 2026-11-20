import type { CallIpVersion, CallMethod, CallRule } from "@/lib/call/types"

/** One row of GET /api/library. */
export interface LibraryItemSummary {
  id: string
  name: string
  description: string
  method: CallMethod | string
  url: string
  createdAt: string
  updatedAt: string
}

/** GET /api/library/:id — same fields as a call request, plus identity. */
export interface LibraryItem extends LibraryItemSummary {
  headers: Record<string, string>
  query: Record<string, string>
  body: string
  bodyExample: string
  timeoutMs: number
  verifyTls: boolean
  ipVersion: CallIpVersion
  proxyUrl: string
  /** Kept as-is on save: the drawer does not edit alert rules yet. */
  rules: CallRule[]
}

/** Body of POST /api/library and PUT /api/library/:id. */
export interface LibraryItemInput {
  name: string
  description?: string
  method?: CallMethod
  url: string
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: string
  bodyExample?: string
  timeoutMs?: number
  verifyTls?: boolean
  ipVersion?: CallIpVersion
  proxyUrl?: string
  rules?: CallRule[]
}

export const LIBRARY_ITEM_MIME = "application/x-uptime-library-item"

export type LibraryImportFormat = "openapi" | "curl" | "postman"

export interface LibraryImportWarning {
  code: string
  field?: string
  message: string
}

/** One candidate of POST /library/import/preview. Payload is a call request. */
export interface LibraryImportCandidate {
  key: string
  payload: LibraryItemInput & { name: string }
  warnings: LibraryImportWarning[]
}

export interface LibraryImportSkipped {
  source: string
  reason: string
}

export interface LibraryImportPreview {
  items: LibraryImportCandidate[]
  skipped: LibraryImportSkipped[]
}
