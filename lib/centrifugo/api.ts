export interface RealtimeConnection {
  token: string
  channel: string
  wsUrl: string
}

/** Quiet no-op when realtime is unavailable. */
export async function getRealtimeConnection(): Promise<RealtimeConnection | null> {
  try {
    const response = await fetch("/api/realtime/connection", {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as Partial<RealtimeConnection>

    if (!data.token || !data.channel) {
      return null
    }

    const wsUrl = data.wsUrl || process.env.NEXT_PUBLIC_CENTRIFUGO_URL
    if (!wsUrl) {
      return null
    }

    return {
      token: data.token,
      channel: data.channel,
      wsUrl,
    }
  } catch {
    return null
  }
}
