"use client"

import { Centrifuge } from "centrifuge"
import { useEffect, useRef } from "react"
import { getRealtimeConnection } from "./api"

/**
 * Connects to Centrifugo using GET /api/realtime/connection.
 * The JWT already includes a server-side `channels` claim, so publications
 * arrive on the client `publication` event (no client subscribe).
 * No-ops quietly when realtime is unavailable.
 */
export function useCentrifuge(
  userId: string | null,
  onPublication: (data: unknown) => void,
  onReconnected?: () => void
) {
  const onPublicationRef = useRef(onPublication)
  const onReconnectedRef = useRef(onReconnected)

  useEffect(() => {
    onPublicationRef.current = onPublication
  }, [onPublication])

  useEffect(() => {
    onReconnectedRef.current = onReconnected
  }, [onReconnected])

  useEffect(() => {
    if (!userId) return

    let centrifuge: Centrifuge | null = null
    let cancelled = false
    let hasConnectedOnce = false

    const connect = async () => {
      const connection = await getRealtimeConnection()
      if (cancelled) return
      if (!connection) {
        console.warn("[Centrifugo] connection unavailable")
        return
      }

      centrifuge = new Centrifuge(connection.wsUrl, {
        token: connection.token,
        getToken: async () => {
          const next = await getRealtimeConnection()
          if (!next?.token) {
            throw new Error("Realtime token refresh failed")
          }
          return next.token
        },
      })

      centrifuge.on("publication", (ctx) => {
        console.log("[Centrifugo] event", { channel: ctx.channel, data: ctx.data })
        onPublicationRef.current(ctx.data)
      })

      centrifuge.on("connected", () => {
        if (hasConnectedOnce) {
          onReconnectedRef.current?.()
        }
        hasConnectedOnce = true
      })

      centrifuge.on("disconnected", (ctx) => {
        console.warn("[Centrifugo] disconnected", ctx)
      })

      centrifuge.connect()
    }

    void connect()

    return () => {
      cancelled = true
      centrifuge?.disconnect()
    }
  }, [userId])
}
