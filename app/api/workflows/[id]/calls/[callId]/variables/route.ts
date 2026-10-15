import { proxyBackend } from "@/lib/proxy-backend"

type RouteContext = {
  params: Promise<{ id: string; callId: string }>
}

async function handle(request: Request, context: RouteContext) {
  const { id, callId } = await context.params
  return proxyBackend(request, `/workflows/${id}/calls/${callId}/variables`)
}

export { handle as GET, handle as POST }
