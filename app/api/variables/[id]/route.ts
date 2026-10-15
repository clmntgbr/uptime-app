import { proxyBackend } from "@/lib/proxy-backend"

type RouteContext = {
  params: Promise<{ id: string }>
}

async function handle(request: Request, context: RouteContext) {
  const { id } = await context.params
  return proxyBackend(request, `/variables/${id}`)
}

export { handle as GET, handle as PUT, handle as DELETE }
