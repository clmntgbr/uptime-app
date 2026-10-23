import { createAuthHeaders } from "@/lib/create-auth-headers"
import { proxyBackendError } from "@/lib/proxy-backend-error"
import { requireAuth } from "@/lib/require-auth"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

type RouteContext = {
  params: Promise<{ id: string; callId: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const { id, callId } = await context.params
    const response = await fetch(
      `${BACKEND_API_URL}/api/workflows/${id}/calls/${callId}/copy`,
      {
        method: "POST",
        headers: createAuthHeaders(auth.token),
      }
    )

    if (!response.ok) {
      return proxyBackendError(response)
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
