import { orderService } from '@/shared/services/order.service'
import { restaurantService } from '@/shared/services/restaurant.service'
import type { AdminStats, Order, Restaurant, RestaurantStats, Review } from '@/shared/types'
import { computeAdminStats, computeRestaurantStats } from '@/shared/utils/stats'
import { adminService } from '@/shared/services/admin.service'
// Replace the bodies with Axios calls when the backend is ready. Keep the signatures and return types.

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load dashboard data (HTTP ${response.status}).`)
  return response.json() as Promise<T>
}

export interface RestaurantOverview {
  /** null when this account has no restaurant linked to it. */
  restaurant: Restaurant | null
  stats: RestaurantStats | null
  orders: Order[]
}

export interface AdminOverview {
  stats: AdminStats
  /** Every order on the platform, newest first. */
  orders: Order[]
  /** Needed to show restaurant names next to orders. */
  restaurants: Restaurant[]
}

export const dashboardService = {
  async getRestaurantOverview(ownerId: number): Promise<RestaurantOverview> {
    const restaurant = await restaurantService.getOwnedByOwnerId(ownerId)
    if (!restaurant) return { restaurant: null, stats: null, orders: [] }

    const [orders, reviews] = await Promise.all([
      fetchJson<Order[]>('/mock/orders.json').then((allOrders) =>
        allOrders.filter((order) => order.restaurantId === restaurant.id),
      ),
      fetchJson<Review[]>('/mock/reviews.json'),
    ])
    return { restaurant, stats: computeRestaurantStats(restaurant.id, orders, reviews), orders }
  },

  async getAdminOverview(): Promise<AdminOverview> {
    const [ordersResponse, users, restaurants, reviews] = await Promise.all([
        orderService.listOrders(1),
      adminService.listUsers(),
      fetchJson<Restaurant[]>('/mock/restaurants.json'),
      fetchJson<Review[]>('/mock/reviews.json'),
    ])
    const orders = ordersResponse.data
    // The fixtures were written for 2026-11-03, so anchor the "last 14 days" to the newest order
    // instead of the real clock; otherwise the chart would slowly empty out as the real date moves on.
    const newest = orders[0]?.createdAt
    const now = newest ? new Date(newest) : new Date()
    return { stats: computeAdminStats({ orders, users, restaurants, reviews }, now), orders, restaurants }
  },
}
