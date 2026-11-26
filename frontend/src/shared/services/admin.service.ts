import { menuItemService } from '@/shared/services/menuItem.service'
import { apiRequest } from '@/shared/api/client'
import type { MenuItem, PaginatedResponse, Restaurant } from '@/shared/types'

export interface AdminMealRow extends MenuItem {
  restaurantName: string
}

export interface AdminRestaurantListQuery {
  page: number
  limit: number
  search?: string
  isActive?: boolean
}

export interface AdminMealListQuery {
  page: number
  limit: number
  search?: string
  isAvailable?: boolean
}

export const adminService = {
  listRestaurantsPage(
    query: AdminRestaurantListQuery,
  ): Promise<PaginatedResponse<Restaurant>> {
    return apiRequest<PaginatedResponse<Restaurant>>('/admin/restaurants', {
      query: {
        page: query.page,
        limit: query.limit,
        search: query.search,
        isActive: query.isActive,
      },
    })
  },

  async setRestaurantIsActive(id: string, isActive: boolean): Promise<void> {
    await apiRequest(`/admin/restaurants/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { isActive },
    })
  },

  listMealsPage(query: AdminMealListQuery): Promise<PaginatedResponse<AdminMealRow>> {
    return apiRequest<PaginatedResponse<AdminMealRow>>('/admin/menu-items', {
      query: {
        page: query.page,
        limit: query.limit,
        search: query.search,
        isAvailable: query.isAvailable,
      },
    })
  },

  async setMealAvailability(id: string, isAvailable: boolean): Promise<void> {
    await menuItemService.setAvailability(id, isAvailable)
  },
}
