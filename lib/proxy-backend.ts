import { createAuthHeaders } from "@/lib/create-auth-headers"
import { proxyBackendError } from "@/lib/proxy-backend-error"
import { requireAuth } from "@/lib/require-auth"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

/** Forwards an authenticated request to `${BACKEND_API_URL}/api${path}`. */
export async function proxyBackend(
  request: Request,
  path: string
): Promise<NextResponse> {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const hasBody = request.method === "POST" || request.method === "PUT"
    const query = new URL(request.url).search
    const response = await fetch(`${BACKEND_API_URL}/api${path}${query}`, {
      method: request.method,
      headers: createAuthHeaders(auth.token),
      body: hasBody ? await request.text() : undefined,
    })

    if (!response.ok) {
      return proxyBackendError(response)
    }

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
