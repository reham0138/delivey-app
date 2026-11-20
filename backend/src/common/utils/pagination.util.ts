import type { PaginationQueryDto } from '../dto/pagination-query.dto'
import type { PaginatedResponse } from '../dto/paginated-response.interface'

// Wraps a page of results in the contract list envelope.
// total_pages is always at least 1, even for empty collections.
export function paginate<T>(
  data: T[],
  total: number,
  query: PaginationQueryDto,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      total_pages: Math.max(1, Math.ceil(total / query.limit)),
    },
  }
}
