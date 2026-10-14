export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

/** Reads `{ data: { message, code, errors } }` produced by `proxyBackendError`. */
export async function parseApiError(
  response: Response,
  fallbackMessage: string
): Promise<ApiError> {
  let message = fallbackMessage
  let code: string | undefined

  try {
    const body = await response.json()
    const payload = body?.data ?? body
    const candidate = payload?.message
    if (typeof candidate === "string" && candidate.trim()) {
      message = candidate
    }

    if (typeof payload?.code === "string") {
      code = payload.code
    }

    const fieldErrors = payload?.errors
    if (fieldErrors && typeof fieldErrors === "object") {
      const details = Object.entries(fieldErrors)
        .map(([field, error]) => `${field} ${error}`)
        .join(", ")
      if (details) message = `${message}: ${details}`
    }
  } catch {
    // Body is empty or not JSON.
  }

  return new ApiError(message, response.status, code)
}
