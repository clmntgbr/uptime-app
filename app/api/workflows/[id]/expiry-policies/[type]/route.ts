import { proxyBackend } from "@/lib/proxy-backend"

type RouteContext = {
  params: Promise<{ id: string; type: string }>
}

export async function PUT(request: Request, context: RouteContext) {
  const { id, type } = await context.params
  return proxyBackend(request, `/workflows/${id}/expiry-policies/${type}`)
}
