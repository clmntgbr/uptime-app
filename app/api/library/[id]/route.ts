import { createAuthHeaders } from "@/lib/create-auth-headers"
import { proxyBackendError } from "@/lib/proxy-backend-error"
import { requireAuth } from "@/lib/require-auth"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  return forward("GET", context)
}

export async function PUT(request: Request, context: RouteContext) {
  return forward("PUT", context, await request.text())
}

export async function DELETE(_request: Request, context: RouteContext) {
  return forward("DELETE", context)
}

async function forward(
  method: "GET" | "PUT" | "DELETE",
  context: RouteContext,
  body?: string
) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const { id } = await context.params
    const response = await fetch(`${BACKEND_API_URL}/api/library/${id}`, {
      method,
      headers: createAuthHeaders(auth.token),
      body,
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
