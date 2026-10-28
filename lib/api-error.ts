export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly data?: unknown

  constructor(
    message: string,
    status: number,
    code?: string,
    data?: unknown
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.data = data
  }
}

type VarOutOfOrderData = {
  call?: string
  conflictCall?: string
  reason?: string
  variable?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value)
}

function asVarOutOfOrderData(value: unknown): VarOutOfOrderData | null {
  if (!isRecord(value)) return null
  return {
    call: typeof value.call === "string" ? value.call : undefined,
    conflictCall:
      typeof value.conflictCall === "string" ? value.conflictCall : undefined,
    reason: typeof value.reason === "string" ? value.reason : undefined,
    variable: typeof value.variable === "string" ? value.variable : undefined,
  }
}

/** Title + description for a toast, based on API code and structured data. */
export function formatApiErrorToast(error: ApiError): {
  title: string
  description: string
} {
  switch (error.code) {
    case "VAR_OUT_OF_ORDER": {
      const data = asVarOutOfOrderData(error.data)
      if (
        data?.reason === "PRODUCED_BY_LATER_CALL" &&
        data.variable &&
        data.call &&
        data.conflictCall
      ) {
        return {
          title: "Variable out of order",
          description: `{{${data.variable}}} is produced by "${data.conflictCall}", which would run after "${data.call}".`,
        }
      }
      if (
        data?.reason === "SELF_REFERENCE" &&
        data.variable &&
        data.call
      ) {
        return {
          title: "Variable out of order",
          description: `"${data.call}" cannot use {{${data.variable}}} that it produces.`,
        }
      }
      return {
        title: "Variable out of order",
        description: error.message,
      }
    }
    case "INVALID_CALL_ORDER":
      return {
        title: "Invalid call order",
        description: error.message,
      }
    case "INVALID_WORKFLOW":
      return {
        title: "Invalid workflow",
        description: error.message,
      }
    default:
      return {
        title: "Request failed",
        description: error.message,
      }
  }
}

/** Reads `{ data: { message, code, data, errors } }` produced by `proxyBackendError`. */
export async function parseApiError(
  response: Response,
  fallbackMessage: string
): Promise<ApiError> {
  let message = fallbackMessage
  let code: string | undefined
  let data: unknown

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

    if (payload?.data !== undefined) {
      data = payload.data
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

  return new ApiError(message, response.status, code, data)
}
