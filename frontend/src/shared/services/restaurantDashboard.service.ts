import { menuItemService } from '@/shared/services/menuItem.service'
import { orderService } from '@/shared/services/order.service'
import { restaurantService } from '@/shared/services/restaurant.service'
import { reviewService } from '@/shared/services/review.service'
import type { MenuItem, Order, OrderStatus, Restaurant, Review } from '@/shared/types'

const MEAL_OVERRIDES_KEY = 'crown-anchor-restaurant-meal-overrides'
const ORDERS_KEY = 'crown-anchor-orders'
const REVIEWS_KEY = 'crown-anchor-reviews'
const ORDER_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'on_the_way', 'delivered']

interface MealOverrides {
  items: MenuItem[]
  deletedIds: string[]
}

export type MealChanges = Pick<
  MenuItem,
  'name' | 'description' | 'price' | 'category' | 'image' | 'ingredients' | 'preparationTimeMinutes' | 'isAvailable' | 'isPopular'
>

function readMealOverrides(): MealOverrides {
  const stored = localStorage.getItem(MEAL_OVERRIDES_KEY)
  if (!stored) return { items: [], deletedIds: [] }

  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch {
    throw new Error('Saved meal changes are invalid.')
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('items' in parsed) ||
    !Array.isArray(parsed.items) ||
    !('deletedIds' in parsed) ||
    !Array.isArray(parsed.deletedIds) ||
    !parsed.deletedIds.every((id: unknown) => typeof id === 'string')
  ) {
    throw new Error('Saved meal changes are invalid.')
  }
  return parsed as MealOverrides
}

function saveMealOverrides(overrides: MealOverrides): void {
  try {
    localStorage.setItem(MEAL_OVERRIDES_KEY, JSON.stringify(overrides))
  } catch {
    throw new Error('Meal changes could not be saved. Check available browser storage.')
  }
}

async function mealsWithOverrides(): Promise<MenuItem[]> {
  const [meals, overrides] = await Promise.all([
    menuItemService.getAll(),
    Promise.resolve(readMealOverrides()),
  ])
  const deletedIds = new Set(overrides.deletedIds)
  const changedById = new Map(overrides.items.map((item) => [item.id, item]))
  const merged = meals
    .filter((meal) => !deletedIds.has(meal.id))
    .map((meal) => changedById.get(meal.id) ?? meal)
  const existingIds = new Set(merged.map((meal) => meal.id))
  return [...merged, ...overrides.items.filter((meal) => !existingIds.has(meal.id) && !deletedIds.has(meal.id))]
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
      mealsWithOverrides(),
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
    const restaurant = await getOwnedRestaurant(ownerId)
    const meals = await mealsWithOverrides()
    const overrides = readMealOverrides()
    const id = String(Math.max(
      0,
      ...meals.map((meal) => Number(meal.id) || 0),
      ...overrides.items.map((meal) => Number(meal.id) || 0),
      ...overrides.deletedIds.map((deletedId) => Number(deletedId) || 0),
     ) + 1)
    const meal: MenuItem = {
      id,
      restaurantId: restaurant.id,
      ...changes,
      nutrition: null,
      rating: 0,
      reviewsCount: 0,
    }
    saveMealOverrides({
      items: [...overrides.items.filter((item) => item.id !== id), meal],
      deletedIds: overrides.deletedIds.filter((deletedId) => deletedId !== id),
    })
    return meal
  },

  async updateMeal(ownerId: string, mealId: string, changes: MealChanges): Promise<void> {
    const restaurant = await getOwnedRestaurant(ownerId)
    const meals = await mealsWithOverrides()
    const meal = meals.find((item) => item.id === mealId && item.restaurantId === restaurant.id)
    if (!meal) throw new Error('Meal not found.')
    const overrides = readMealOverrides()
    saveMealOverrides({
      items: [...overrides.items.filter((item) => item.id !== mealId), { ...meal, ...changes }],
      deletedIds: overrides.deletedIds.filter((id) => id !== mealId),
    })
  },

  async deleteMeal(ownerId: string, mealId: string): Promise<void> {
    const restaurant = await getOwnedRestaurant(ownerId)
    const meals = await mealsWithOverrides()
    if (!meals.some((meal) => meal.id === mealId && meal.restaurantId === restaurant.id)) {
      throw new Error('Meal not found.')
    }
    const overrides = readMealOverrides()
    saveMealOverrides({
      items: overrides.items.filter((meal) => meal.id !== mealId),
      deletedIds: [...new Set([...overrides.deletedIds, mealId])],
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
