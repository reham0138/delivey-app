import { menuItemService } from '@/shared/services/menuItem.service'
import { reviewService } from '@/shared/services/review.service'
import { apiRequest } from '@/shared/api/client'
import { adminUsersService } from '@/shared/services/adminUsers.service'
import type { AdminUserRow } from '@/shared/services/adminUsers.service'
import type { MenuItem, PaginatedResponse, Restaurant, Review } from '@/shared/types'

// Replace the bodies with Axios calls when the backend is ready. Keep the signatures and return types.

export interface AdminReviewRow extends Review {
  menuItemName: string
  restaurantName: string
}

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

async function listRestaurants(): Promise<Restaurant[]> {
  return getAllPages<Restaurant>('/admin/restaurants')
}

async function listRestaurantsPage(
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
}

async function listMeals(): Promise<AdminMealRow[]> {
  return getAllPages<AdminMealRow>('/admin/menu-items')
}

async function listMealsPage(
  query: AdminMealListQuery,
): Promise<PaginatedResponse<AdminMealRow>> {
  return apiRequest<PaginatedResponse<AdminMealRow>>('/admin/menu-items', {
    query: {
      page: query.page,
      limit: query.limit,
      search: query.search,
      isAvailable: query.isAvailable,
    },
  })
}

export const adminService = {
  /** All users for the admin overview stats; the paged list lives in adminUsers.service. */
  listUsers(): Promise<AdminUserRow[]> {
    return adminUsersService.listAllUsers()
  },

  listRestaurants,
  listRestaurantsPage,

  async setRestaurantIsActive(id: string, isActive: boolean): Promise<void> {
    await apiRequest(`/admin/restaurants/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { isActive },
    })
  },

  async listReviews(): Promise<AdminReviewRow[]> {
    const [reviews, meals, restaurants] = await Promise.all([
      reviewService.listAll(),
      menuItemService.getAll(),
      this.listRestaurants(),
    ])
    const mealsById = new Map(meals.map((meal) => [meal.id, meal.name]))
    const restaurantsById = new Map(restaurants.map((restaurant) => [restaurant.id, restaurant.name]))
    return reviews.map((review) => ({
      ...review,
      menuItemName: mealsById.get(review.menuItemId) ?? `Meal #${review.menuItemId}`,
      restaurantName: restaurantsById.get(review.restaurantId) ?? `Restaurant #${review.restaurantId}`,
    }))
  },

  async deleteReview(id: string): Promise<void> {
    await reviewService.deleteReview(id)
  },

  listMeals,
  listMealsPage,

  async setMealAvailability(id: string, isAvailable: boolean): Promise<void> {
    await menuItemService.setAvailability(id, isAvailable)
  },
}

async function getAllPages<T>(path: string): Promise<T[]> {
  const firstPage = await apiRequest<PaginatedResponse<T>>(path, {
    query: { page: 1, limit: 50 },
  })
  const data = [...firstPage.data]
  for (let page = 2; page <= firstPage.meta.total_pages; page += 1) {
    const result = await apiRequest<PaginatedResponse<T>>(path, {
      query: { page, limit: 50 },
    })
    data.push(...result.data)
  }
  return data
}