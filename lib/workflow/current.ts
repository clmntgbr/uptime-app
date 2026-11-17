"use client"

import { usePathname } from "next/navigation"

const WORKFLOW_PATH = /^\/workflows\/([^/]+)/

/** Id of the workflow open in the current page, or null outside a workflow. */
export function useCurrentWorkflowId(): string | null {
  const pathname = usePathname()
  return WORKFLOW_PATH.exec(pathname)?.[1] ?? null
}
