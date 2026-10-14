export interface WorkflowListItem {
  id: string
  name: string
}

export interface Workflow {
  id: string
  name: string
  intervalSeconds: number
  enabled: boolean
  status: string | null
  nextRunAt: string | null
  lastRunAt: string | null
  lastStatus: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkflowInput {
  name: string
  intervalSeconds: number
  enabled: boolean
}

export interface WorkflowIdResponse {
  id: string
}
