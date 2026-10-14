import { createAuthHeaders } from "@/lib/create-auth-headers"
import { proxyBackendError } from "@/lib/proxy-backend-error"
import { requireAuth } from "@/lib/require-auth"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const query = request.nextUrl.searchParams.toString()
    const url = query
      ? `${BACKEND_API_URL}/api/workflows?${query}`
      : `${BACKEND_API_URL}/api/workflows`

    const response = await fetch(url, {
      method: "GET",
      headers: createAuthHeaders(auth.token),
    })

    if (!response.ok) {
      return proxyBackendError(response)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const body = await request.text()
    const response = await fetch(`${BACKEND_API_URL}/api/workflows`, {
      method: "POST",
      headers: createAuthHeaders(auth.token),
      body,
    })

    if (!response.ok) {
      return proxyBackendError(response)
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
