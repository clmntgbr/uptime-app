import { proxyBackend } from "@/lib/proxy-backend"

type RouteContext = {
  params: Promise<{ id: string; kind: string }>
}

export async function PUT(request: Request, context: RouteContext) {
  const { id, kind } = await context.params
  return proxyBackend(request, `/workflows/${id}/incident-policies/${kind}`)
}
