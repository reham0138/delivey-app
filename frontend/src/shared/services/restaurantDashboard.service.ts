import { restaurantService } from '@/shared/services/restaurant.service'
import { apiRequest } from '@/shared/api/client'
import type { MenuItem, Order, OrderStatus, PaginatedResponse, Restaurant, Review } from '@/shared/types'

export type MealChanges = Pick<
  MenuItem,
  'name' | 'description' | 'price' | 'category' | 'image' | 'ingredients' | 'preparationTimeMinutes' | 'isAvailable' | 'isPopular'
>

async function getAllPages<T>(path: string): Promise<T[]> {
  const firstPage = await apiRequest<PaginatedResponse<T>>(path, {
    query: { page: 1, limit: 50 },
  })
  const items = [...firstPage.data]
  for (let page = 2; page <= firstPage.meta.total_pages; page += 1) {
    const result = await apiRequest<PaginatedResponse<T>>(path, {
      query: { page, limit: 50 },
    })
    items.push(...result.data)
  }
  return items
}

async function getOwnedRestaurant(ownerId: string): Promise<Restaurant> {
  const restaurant = await restaurantService.getOwnedByOwnerId(ownerId)
  if (!restaurant) throw new Error('No restaurant profile is associated with this account.')
  return restaurant
}

export const restaurantDashboardService = {
  async load(ownerId: string): Promise<{
    restaurant: Restaurant | null
    meals: MenuItem[]
    orders: Order[]
    reviews: Review[]
  }> {
    const restaurant = await restaurantService.getOwnedByOwnerId(ownerId)
    if (!restaurant) return { restaurant: null, meals: [], orders: [], reviews: [] }
    const [allMeals, orders, reviews] = await Promise.all([
      getAllPages<MenuItem>('/restaurant/menu-items'),
      getAllPages<Order>('/restaurant/orders'),
      getAllPages<Review>('/restaurant/reviews'),
    ])
    return {
      restaurant,
      meals: allMeals.filter((meal) => meal.restaurantId === restaurant.id),
      orders,
      reviews,
    }
  },

  async createMeal(ownerId: string, changes: MealChanges): Promise<MenuItem> {
    await getOwnedRestaurant(ownerId)
    return apiRequest<MenuItem>('/restaurant/menu-items', {
      method: 'POST',
      body: changes,
    })
  },

  async updateMeal(ownerId: string, mealId: string, changes: MealChanges): Promise<void> {
    await getOwnedRestaurant(ownerId)
    await apiRequest<MenuItem>(`/restaurant/menu-items/${encodeURIComponent(mealId)}`, {
      method: 'PATCH',
      body: changes,
    })
  },

  async deleteMeal(ownerId: string, mealId: string): Promise<void> {
    await getOwnedRestaurant(ownerId)
    await apiRequest<void>(`/restaurant/menu-items/${encodeURIComponent(mealId)}`, {
      method: 'DELETE',
    })
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    await apiRequest<Order>(`/restaurant/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: { status },
    })
  },

  async cancelOrder(orderId: string, reason: string): Promise<void> {
    const trimmedReason = reason.trim()
    if (!trimmedReason) throw new Error('Enter a reason for cancelling this order.')
    await apiRequest<Order>(`/restaurant/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      body: { reason: trimmedReason },
    })
  },

  async reportReview(reviewId: string, reason: string): Promise<void> {
    const trimmedReason = reason.trim()
    if (!trimmedReason) throw new Error('Enter a reason for reporting this review.')
    await apiRequest<Review>(`/restaurant/reviews/${encodeURIComponent(reviewId)}/report`, {
      method: 'POST',
      body: { reason: trimmedReason },
    })
  },
}
