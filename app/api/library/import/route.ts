import { proxyBackend } from "@/lib/proxy-backend"

export function POST(request: Request) {
  return proxyBackend(request, "/library/import")
}
