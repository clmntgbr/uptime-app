import { proxyBackend } from "@/lib/proxy-backend"

type RouteContext = {
  params: Promise<{ id: string; callId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { id, callId } = await context.params
  return proxyBackend(
    request,
    `/workflows/${id}/calls/${callId}/response-keys`
  )
}
