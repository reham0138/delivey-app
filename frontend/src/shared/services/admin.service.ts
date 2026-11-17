import { listRegisteredUsers } from '@/shared/api/auth'
import { menuItemService } from '@/shared/services/menuItem.service'
import { orderService } from '@/shared/services/order.service'
import { reviewService } from '@/shared/services/review.service'
import { adminState } from '@/shared/services/adminState.service'
import type { AccountStatus, MenuItem, Order, Restaurant, Review, User, UserRole } from '@/shared/types'

// Replace the bodies with Axios calls when the backend is ready. Keep the signatures and return types.

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load admin data (HTTP ${response.status}).`)
  return response.json() as Promise<T>
}

export interface AdminUserRow {
  id: number
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

export const adminService = {
  /** Demo accounts from users.json plus accounts created with the sign-up form. */
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
    const knownEmails = new Set(demoRows.map((row) => row.email.toLowerCase()))
    const registeredRows: AdminUserRow[] = listRegisteredUsers()
      .filter((user) => !knownEmails.has(user.email.toLowerCase()))
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
        role: user.role,
        status: adminState.getUserStatus(user.email, 'active'),
        createdAt: null,
        source: 'registered',
      }))
    return [...demoRows, ...registeredRows]
  },

  async listRestaurants(): Promise<Restaurant[]> {
    const restaurants = await fetchJson<Restaurant[]>('/mock/restaurants.json')
    return restaurants.map((restaurant) => ({
      ...restaurant,
      isActive: adminState.getRestaurantIsActive(restaurant.id, restaurant.isActive),
    }))
  },

  async setRestaurantIsActive(id: number, isActive: boolean): Promise<void> {
    const restaurant = (await this.listRestaurants()).find((item) => item.id === id)
    if (!restaurant) throw new Error('Restaurant not found.')
    adminState.setRestaurantIsActive(id, isActive)
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

  async deleteReview(id: number): Promise<void> {
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

  async deleteOrder(id: number): Promise<void> {
    await orderService.deleteOrder(id)
  },

  async listMeals(): Promise<AdminMealRow[]> {
    const [meals, restaurants] = await Promise.all([
      menuItemService.getAll(),
      this.listRestaurants(),
    ])
    const restaurantsById = new Map(restaurants.map((restaurant) => [restaurant.id, restaurant.name]))
    return meals.map((meal) => ({
      ...meal,
      restaurantName: restaurantsById.get(meal.restaurantId) ?? `Restaurant #${meal.restaurantId}`,
    }))
  },

  async setMealAvailability(id: number, isAvailable: boolean): Promise<void> {
    await menuItemService.setAvailability(id, isAvailable)
  },

  async setUserStatus(email: string, status: AccountStatus): Promise<void> {
    const user = (await this.listUsers()).find((row) => row.email.toLowerCase() === email.toLowerCase())
    if (!user) throw new Error('User not found.')
    if (user.role === 'admin') throw new Error('Admin accounts cannot be suspended.')
    adminState.setUserStatus(user.email, status)
  },
}