import { proxyBackend } from "@/lib/proxy-backend"

export function GET(request: Request) {
  return proxyBackend(request, "/variables")
}

export function POST(request: Request) {
  return proxyBackend(request, "/variables")
}
