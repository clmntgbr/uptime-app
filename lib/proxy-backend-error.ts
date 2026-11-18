import { NextResponse } from "next/server"

/**
 * Forward a non-OK backend response to the browser with its body (when present).
 * Preserves the API error envelope `{ message, errors?, code? }` — never wraps in
 * `{ success, data }`. Safe when the body is empty or not JSON.
 */
export async function proxyBackendError(
  response: Response
): Promise<NextResponse> {
  const text = await response.text()

  if (text) {
    try {
      const data = JSON.parse(text)
      if (data !== null && typeof data === "object" && !Array.isArray(data)) {
        return NextResponse.json(data, { status: response.status })
      }
    } catch {
      // Not JSON — fall through to a plain message envelope.
    }
    return NextResponse.json(
      { message: text },
      { status: response.status }
    )
  }

  return NextResponse.json(
    { message: "Request failed" },
    { status: response.status }
  )
}
