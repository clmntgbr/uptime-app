import { createAuthHeaders } from "@/lib/create-auth-headers"
import { proxyBackendError } from "@/lib/proxy-backend-error"
import { requireAuth } from "@/lib/require-auth"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const { id, itemId } = await context.params
    const body = await request.text()
    const response = await fetch(
      `${BACKEND_API_URL}/api/workflows/${id}/calls/from-library/${itemId}`,
      {
        method: "POST",
        headers: createAuthHeaders(auth.token),
        body: body || undefined,
      }
    )

    if (!response.ok) {
      return proxyBackendError(response)
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
