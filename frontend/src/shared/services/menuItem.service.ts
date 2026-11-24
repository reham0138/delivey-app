import { apiRequest } from '@/shared/api/client'
import type { MenuItem, PaginatedResponse } from '@/shared/types'

const PAGE_LIMIT = 50

export interface MenuItemListQuery {
  page: number
  limit: number
  search?: string
  restaurantId?: string
  category?: string
  openOnly?: boolean
  sort: 'popular' | 'rating' | 'price_asc' | 'price_desc' | 'name'
}

async function getAllPages(): Promise<MenuItem[]> {
  const firstPage = await apiRequest<PaginatedResponse<MenuItem>>('/menu-items', {
    query: { page: 1, limit: PAGE_LIMIT, sort: 'rating' },
  })
  const data = [...firstPage.data]
  for (let page = 2; page <= firstPage.meta.total_pages; page += 1) {
    const result = await apiRequest<PaginatedResponse<MenuItem>>('/menu-items', {
      query: { page, limit: PAGE_LIMIT, sort: 'rating' },
    })
    data.push(...result.data)
  }
  return data
}

async function getAll(): Promise<MenuItem[]>
async function getAll(query: MenuItemListQuery): Promise<PaginatedResponse<MenuItem>>
async function getAll(query?: MenuItemListQuery): Promise<MenuItem[] | PaginatedResponse<MenuItem>> {
  if (query) {
    return apiRequest<PaginatedResponse<MenuItem>>('/menu-items', {
      query: {
        page: query.page,
        limit: query.limit,
        search: query.search,
        restaurantId: query.restaurantId,
        category: query.category,
        openOnly: query.openOnly,
        sort: query.sort,
      },
    })
  }

  return getAllPages()
}

export const menuItemService = {
  getAll,

  async getById(id: string): Promise<MenuItem> {
    return apiRequest<MenuItem>(`/menu-items/${encodeURIComponent(id)}`)
  },

  async setAvailability(id: string, isAvailable: boolean): Promise<void> {
    await apiRequest(`/admin/menu-items/${encodeURIComponent(id)}/availability`, {
      method: 'PATCH',
      body: { isAvailable },
    })
  },
}
