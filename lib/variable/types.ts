export type CallVariableSource = "json" | "header" | "status" | "regex"

export interface GlobalVariable {
  id: string
  name: string
  type: "global"
  value: string
  secret?: boolean
}

export interface GlobalVariableCreateInput {
  name: string
  value: string
  secret: boolean
}

export interface GlobalVariableUpdateInput {
  value: string
  secret: boolean
}

export interface StaticVariable {
  name: string
  type: "static"
  value: string
  secret?: boolean
}

export interface StaticVariableCreateInput {
  name: string
  value: string
  secret: boolean
}

export interface StaticVariableUpdateInput {
  value: string
  secret: boolean
}

export interface CallVariable {
  id?: string
  name: string
  type: "call"
  path?: string
  source: CallVariableSource
  /** When true, the extracted value is masked in logs and results. */
  secret?: boolean
}

/**
 * Body of POST /workflows/:id/calls/:callId/variables.
 * Omit path + source to extract the HTTP status (`{ "name": "code" }`).
 */
export interface CallVariableCreateInput {
  name: string
  path?: string
  source?: CallVariableSource
  secret?: boolean
}

export interface CallVariableUpdateInput {
  path?: string
  source?: CallVariableSource
  secret?: boolean
}

/** Builds the POST/PUT JSON body expected by the backend. */
export function toCallVariableBody(
  input: CallVariableCreateInput | CallVariableUpdateInput
): Record<string, unknown> {
  const source = "source" in input ? input.source : undefined
  const path = input.path?.trim()
  const isStatus =
    source === "status" || (!source && !path)

  const body: Record<string, unknown> = {}
  if ("name" in input && input.name) {
    body.name = input.name
  }
  if (!isStatus) {
    if (source) body.source = source
    if (path) body.path = path
  }
  if (input.secret) {
    body.secret = true
  }
  return body
}

export type AvailableVariableType = "global" | "static" | "call"

/** Mirrors backend `Available` — flat shape for all scopes. */
export interface AvailableVariable {
  name: string
  type: AvailableVariableType
  path: string
  source: string
  callId: string
  callName: string
  secret: boolean
  value: string
}
