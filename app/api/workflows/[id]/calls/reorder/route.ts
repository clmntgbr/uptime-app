import { proxyBackend } from "@/lib/proxy-backend"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params
  return proxyBackend(request, `/workflows/${id}/calls/reorder`)
}
