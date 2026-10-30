import type { AvailableVariable } from "./types"

export type WorkflowVariableGroup = {
  key: string
  label: string
  variables: AvailableVariable[]
}

/** Groups workflow variables for display: Global, Static, then one group per call. */
export function groupWorkflowVariables(
  variables: AvailableVariable[]
): WorkflowVariableGroup[] {
  const globals: AvailableVariable[] = []
  const statics: AvailableVariable[] = []
  const byCall = new Map<string, { callName: string; variables: AvailableVariable[] }>()

  for (const variable of variables) {
    if (variable.type === "global") {
      globals.push(variable)
      continue
    }
    if (variable.type === "static") {
      statics.push(variable)
      continue
    }
    const callId = variable.callId || variable.callName || variable.name
    const existing = byCall.get(callId)
    if (existing) {
      existing.variables.push(variable)
    } else {
      byCall.set(callId, {
        callName: variable.callName || "Call",
        variables: [variable],
      })
    }
  }

  const groups: WorkflowVariableGroup[] = []
  if (globals.length) {
    groups.push({ key: "global", label: "Global", variables: globals })
  }
  if (statics.length) {
    groups.push({ key: "static", label: "Static", variables: statics })
  }
  for (const [callId, group] of byCall) {
    groups.push({
      key: callId,
      label: group.callName,
      variables: group.variables,
    })
  }
  return groups
}
