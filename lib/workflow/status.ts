export type WorkflowHealth = "healthy" | "failing" | "paused"

export function workflowHealth(input: {
  enabled: boolean
  openIncident?: boolean
  lastStatus?: string
}): WorkflowHealth {
  if (!input.enabled) return "paused"
  if (
    input.openIncident ||
    input.lastStatus === "failed" ||
    input.lastStatus === "error"
  ) {
    return "failing"
  }
  return "healthy"
}

export function workflowHealthLabel(health: WorkflowHealth): string {
  switch (health) {
    case "healthy":
      return "Healthy"
    case "failing":
      return "Failing"
    case "paused":
      return "Paused"
  }
}
