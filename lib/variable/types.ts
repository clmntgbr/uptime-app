export type CallVariableSource = "json" | "header" | "status" | "regex"

export interface GlobalVariable {
  id: string
  name: string
  type: "global"
  /** Masked (`••••`) when `secret` is true. */
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
  /** Masked (`••••`) when `secret` is true. */
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
  name: string
  type: "call"
  path?: string
  source: CallVariableSource
  /** When true, the extracted value is masked in logs and results. */
  secret?: boolean
}

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

export type AvailableVariable =
  | Omit<GlobalVariable, "id">
  | StaticVariable
  | (CallVariable & { callId: string; callName: string })
