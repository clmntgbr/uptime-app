import { createAuthHeaders } from "@/lib/create-auth-headers"
import { proxyBackendError } from "@/lib/proxy-backend-error"
import { requireAuth } from "@/lib/require-auth"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

type RouteContext = {
  params: Promise<{ id: string; runId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const { id, runId } = await context.params
    const response = await fetch(
      `${BACKEND_API_URL}/api/workflows/${encodeURIComponent(id)}/runs/${encodeURIComponent(runId)}`,
      {
        method: "GET",
        headers: createAuthHeaders(auth.token),
      }
    )

    if (!response.ok) {
      return proxyBackendError(response)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
