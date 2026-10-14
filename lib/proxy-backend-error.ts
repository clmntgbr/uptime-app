import { NextResponse } from "next/server"

/**
 * Forward a non-OK backend response to the browser with its body (when present).
 * Safe when the body is empty or not JSON — avoids turning real 4xx into 500.
 */
export async function proxyBackendError(
  response: Response
): Promise<NextResponse> {
  const text = await response.text()
  let data: unknown = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  return NextResponse.json(
    { success: false, data },
    { status: response.status }
  )
}
