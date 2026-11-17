import type { AvailableVariable } from "@/lib/variable/types"
import type { GlobalVariable } from "@/lib/variable/types"

/**
 * Variables offered in the library editor. Library items belong to no workflow
 * and no call, so only the user's global variables are suggested. Other
 * placeholders stay free text and resolve when the item is added to a workflow.
 */
export function libraryVariables(
  globals: GlobalVariable[] | undefined
): AvailableVariable[] {
  return (globals ?? []).map((variable) => ({
    name: variable.name,
    type: "global",
    path: "",
    source: "",
    callId: "",
    callName: "",
    secret: variable.secret ?? false,
    value: variable.value,
  }))
}
