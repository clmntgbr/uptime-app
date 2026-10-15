import { proxyBackend } from "@/lib/proxy-backend"

type RouteContext = {
  params: Promise<{ id: string; callId: string; name: string }>
}

async function handle(request: Request, context: RouteContext) {
  const { id, callId, name } = await context.params
  return proxyBackend(
    request,
    `/workflows/${id}/calls/${callId}/variables/${encodeURIComponent(name)}`
  )
}

export { handle as GET, handle as PUT, handle as DELETE }
