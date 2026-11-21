import { proxyBackend } from "@/lib/proxy-backend"

export async function GET(request: Request) {
  return proxyBackend(request, "/feed")
}
