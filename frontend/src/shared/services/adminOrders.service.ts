import { apiRequest } from '@/shared/api/client'
import type { Order, PaginatedResponse } from '@/shared/types'

export type AdminOrderRow = Order

export interface AdminOrdersListQuery {
  page: number
  limit: number
  search?: string
  status?: Order['status']
  restaurantId?: string
  from?: string
  to?: string
}

export interface RestaurantOption {
  id: string
  name: string
}

const PAGE_LIMIT = 50

async function getAllPages<T>(path: string): Promise<T[]> {
  const firstPage = await apiRequest<PaginatedResponse<T>>(path, {
    query: { page: 1, limit: PAGE_LIMIT },
  })
  const data = [...firstPage.data]
  for (let page = 2; page <= firstPage.meta.total_pages; page += 1) {
    const next = await apiRequest<PaginatedResponse<T>>(path, {
      query: { page, limit: PAGE_LIMIT },
    })
    data.push(...next.data)
  }
  return data
}

export const adminOrdersService = {
  listOrdersPage(query: AdminOrdersListQuery): Promise<PaginatedResponse<AdminOrderRow>> {
    return apiRequest<PaginatedResponse<AdminOrderRow>>('/admin/orders', {
      query: {
        page: query.page,
        limit: query.limit,
        search: query.search,
        status: query.status,
        restaurantId: query.restaurantId,
        from: query.from,
        to: query.to,
      },
    })
  },

  /** Every restaurant as a filter option (the admin restaurant list is small). */
  async listRestaurantOptions(): Promise<RestaurantOption[]> {
    const restaurants = await getAllPages<{ id: string; name: string }>('/admin/restaurants')
    return restaurants.map((restaurant) => ({ id: restaurant.id, name: restaurant.name }))
  },

  /** Cancel replaces delete: orders are never destroyed (contract section 8). */
  cancelOrder(id: string, reason: string): Promise<Order> {
    return apiRequest<Order>(`/admin/orders/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: { reason: reason.trim() },
    })
  },
}
