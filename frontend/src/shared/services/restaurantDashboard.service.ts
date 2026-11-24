import { orderService } from '@/shared/services/order.service'
import { restaurantService } from '@/shared/services/restaurant.service'
import { reviewService } from '@/shared/services/review.service'
import { apiRequest } from '@/shared/api/client'
import type { MenuItem, Order, OrderStatus, PaginatedResponse, Restaurant, Review } from '@/shared/types'

const ORDERS_KEY = 'crown-anchor-orders'
const REVIEWS_KEY = 'crown-anchor-reviews'
const ORDER_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'on_the_way', 'delivered']

export type MealChanges = Pick<
  MenuItem,
  'name' | 'description' | 'price' | 'category' | 'image' | 'ingredients' | 'preparationTimeMinutes' | 'isAvailable' | 'isPopular'
>

async function getOwnerMeals(): Promise<MenuItem[]> {
  const firstPage = await apiRequest<PaginatedResponse<MenuItem>>('/restaurant/menu-items', {
    query: { page: 1, limit: 50 },
  })
  const meals = [...firstPage.data]
  for (let page = 2; page <= firstPage.meta.total_pages; page += 1) {
    const result = await apiRequest<PaginatedResponse<MenuItem>>('/restaurant/menu-items', {
      query: { page, limit: 50 },
    })
    meals.push(...result.data)
  }
  return meals
}

function saveReviews(reviews: Review[]): void {
  try {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews))
  } catch {
    throw new Error('The review report could not be saved.')
  }
}

function saveOrders(orders: Order[]): void {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
  } catch {
    throw new Error('The order status could not be saved.')
  }
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
    const [allMeals, allOrders, reviews] = await Promise.all([
      getOwnerMeals(),
      orderService.listAllOrders(),
      reviewService.getByRestaurantId(restaurant.id, { includeReported: true }),
    ])
    return {
      restaurant,
      meals: allMeals.filter((meal) => meal.restaurantId === restaurant.id),
      orders: allOrders.filter((order) => order.restaurantId === restaurant.id),
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

  async updateOrderStatus(ownerId: string, orderId: string, status: OrderStatus): Promise<void> {
    const restaurant = await getOwnedRestaurant(ownerId)
    const orders = await orderService.listAllOrders()
    const orderIndex = orders.findIndex((item) => item.id === orderId && item.restaurantId === restaurant.id)
    if (orderIndex < 0) throw new Error('Order not found.')
    const order = orders[orderIndex]
    const currentIndex = ORDER_FLOW.indexOf(order.status)
    if (currentIndex < 0 || ORDER_FLOW[currentIndex + 1] !== status) {
      throw new Error('Order status can only move to the next step.')
    }
    const updated: Order = {
      ...order,
      status,
      simulatedTracking: false,
      statusHistory: [...order.statusHistory, { status, at: new Date().toISOString() }],
    }
    orders[orderIndex] = updated
    saveOrders(orders)
  },

  async reportReview(ownerId: string, reviewId: string, reason: string): Promise<void> {
    const restaurant = await getOwnedRestaurant(ownerId)
    const reviews = await reviewService.listAll()
    const reviewIndex = reviews.findIndex(
      (item) => item.id === reviewId && item.restaurantId === restaurant.id,
    )
    if (reviewIndex < 0) throw new Error('Review not found.')
    if (reviews[reviewIndex].isReported) throw new Error('This review has already been reported.')
    const trimmedReason = reason.trim()
    if (!trimmedReason) throw new Error('Enter a reason for reporting this review.')
    reviews[reviewIndex] = {
      ...reviews[reviewIndex],
      isReported: true,
      reportReason: trimmedReason,
    }
    saveReviews(reviews)
  },
}
