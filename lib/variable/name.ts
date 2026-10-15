const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
const MAX_NAME_LENGTH = 64
const RESERVED_NAMES = new Set(["timestamp", "uuid", "run_id"])

/** Validates a variable name against the backend rules. Returns an error message or null. */
export function validateVariableName(name: string): string | null {
  const trimmed = name.trim()

  if (!trimmed) {
    return "Name is required."
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `Name must be at most ${MAX_NAME_LENGTH} characters.`
  }
  if (!NAME_PATTERN.test(trimmed)) {
    return "Use letters, digits and underscores, starting with a letter or underscore."
  }
  if (RESERVED_NAMES.has(trimmed)) {
    return `"${trimmed}" is reserved.`
  }

  return null
}

export const VARIABLE_NAME_HINT =
  "Letters, digits and _ only. Must start with a letter or _. Not: timestamp, uuid, run_id."
