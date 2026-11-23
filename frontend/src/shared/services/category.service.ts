import { apiRequest } from '@/shared/api/client'
import type { Category, PaginatedResponse } from '@/shared/types'

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const response = await apiRequest<PaginatedResponse<Category>>('/categories', {
      query: { page: 1, limit: 50 },
    })
    return response.data
  },
}
