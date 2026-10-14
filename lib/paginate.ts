export interface Paginate<TData> {
  members: TData[]
  page: number
  limit: number
  totalPages: number
  total: number
}

export interface PaginateParams {
  page?: number
  limit?: number
  sortBy?: string
  orderBy?: "asc" | "desc"
  search?: string
}

export function buildQueryString(params?: PaginateParams): string {
  if (!params) return ""

  const search = new URLSearchParams()
  if (params.page != null) search.set("page", String(params.page))
  if (params.limit != null) search.set("limit", String(params.limit))
  if (params.sortBy) search.set("sortBy", params.sortBy)
  if (params.orderBy) search.set("orderBy", params.orderBy)
  if (params.search) search.set("search", params.search)

  const serialized = search.toString()
  return serialized ? `?${serialized}` : ""
}
