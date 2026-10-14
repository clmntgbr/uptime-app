export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/** Reads `{ data: { message } }` produced by `proxyBackendError`. */
export async function parseApiError(
  response: Response,
  fallbackMessage: string
): Promise<ApiError> {
  let message = fallbackMessage

  try {
    const body = await response.json()
    const candidate = body?.data?.message ?? body?.message
    if (typeof candidate === "string" && candidate.trim()) {
      message = candidate
    }
  } catch {
    // Body is empty or not JSON.
  }

  return new ApiError(message, response.status)
}
