import { menuItemService } from '@/shared/services/menuItem.service'
import { orderService } from '@/shared/services/order.service'
import { reviewService } from '@/shared/services/review.service'
import { adminState } from '@/shared/services/adminState.service'
import { apiRequest } from '@/shared/api/client'
import type { AccountStatus, MenuItem, Order, PaginatedResponse, Restaurant, Review, User, UserRole } from '@/shared/types'
import { normalizeMockIds } from '@/shared/utils/normalizeMockIds'

// Replace the bodies with Axios calls when the backend is ready. Keep the signatures and return types.

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load admin data (HTTP ${response.status}).`)
  return Promise.resolve(normalizeMockIds((await response.json()) as T))
}

export interface AdminUserRow {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  /** The admin's decision if there is one, otherwise the status from the fixture. */
  status: AccountStatus
  /** null for accounts made with the sign-up form (the mock does not store a date). */
  createdAt: string | null
  source: 'demo' | 'registered'
}

export interface AdminReviewRow extends Review {
  menuItemName: string
  restaurantName: string
}

export interface AdminOrderRow extends Order {
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
  /** Demo accounts from users.json. Registered accounts live on the backend (admin service is still mock-driven). */
  async listUsers(): Promise<AdminUserRow[]> {
    const fixtures = await fetchJson<User[]>('/mock/users.json')
    const demoRows: AdminUserRow[] = fixtures.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: adminState.getUserStatus(user.email, user.status),
      createdAt: user.createdAt,
      source: 'demo',
    }))
    return demoRows
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

  async listOrders(): Promise<AdminOrderRow[]> {
    const [orders, restaurants] = await Promise.all([
      orderService.listAllOrders(),
      this.listRestaurants(),
    ])
    const restaurantsById = new Map(restaurants.map((restaurant) => [restaurant.id, restaurant.name]))
    return orders.map((order) => ({
      ...order,
      restaurantName: restaurantsById.get(order.restaurantId) ?? `Restaurant #${order.restaurantId}`,
    }))
  },

  async deleteOrder(id: string): Promise<void> {
    await orderService.deleteOrder(id)
  },

  listMeals,
  listMealsPage,

  async setMealAvailability(id: string, isAvailable: boolean): Promise<void> {
    await menuItemService.setAvailability(id, isAvailable)
  },

  async setUserStatus(email: string, status: AccountStatus): Promise<void> {
    const user = (await this.listUsers()).find((row) => row.email.toLowerCase() === email.toLowerCase())
    if (!user) throw new Error('User not found.')
    if (user.role === 'admin') throw new Error('Admin accounts cannot be suspended.')
    adminState.setUserStatus(user.email, status)
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