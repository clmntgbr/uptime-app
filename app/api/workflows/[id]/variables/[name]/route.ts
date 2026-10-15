import { proxyBackend } from "@/lib/proxy-backend"

type RouteContext = {
  params: Promise<{ id: string; name: string }>
}

async function handle(request: Request, context: RouteContext) {
  const { id, name } = await context.params
  return proxyBackend(
    request,
    `/workflows/${id}/variables/${encodeURIComponent(name)}`
  )
}

export { handle as GET, handle as PUT, handle as DELETE }
