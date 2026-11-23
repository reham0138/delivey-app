import type {
  AdminStats,
  DailyOrderRevenue,
  Order,
  OrdersByStatus,
  Restaurant,
  RestaurantStats,
  Review,
  TopMenuItem,
  TopRestaurant,
  User,
  UserRole,
} from '@/shared/types'

/**
 * Pure functions that turn raw lists (orders, reviews, users...) into dashboard numbers.
 * No fetching and no React here, so they are easy to test and easy to replace
 * with a backend endpoint later (the return types stay the same).
 *
 * Money rules (taken from the numbers in public/mock/stats.json):
 * - Platform revenue (admin)   = sum of `total` of DELIVERED orders.
 * - Restaurant revenue         = sum of `subtotal` of DELIVERED orders (delivery fee is not theirs).
 * - Order counts               = every order, including cancelled ones.
 */

const DAY_MS = 24 * 60 * 60 * 1000

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function countByStatus(orders: Order[]): OrdersByStatus {
  const counts: OrdersByStatus = {}
  for (const order of orders) {
    counts[order.status] = (counts[order.status] ?? 0) + 1
  }
  return counts
}

function deliveredOnly(orders: Order[]): Order[] {
  return orders.filter((order) => order.status === 'delivered')
}

function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0)
}

function topItems(orders: Order[], limit: number): TopMenuItem[] {
  // Ties are broken by whichever item was ordered first (lowest order id), so the result
  // does not depend on how the caller happened to sort the list.
  const oldestFirst = [...orders].sort((a, b) => a.id.localeCompare(b.id))
  const units = new Map<string, number>()
  for (const order of oldestFirst) {
    if (order.status === 'cancelled') continue
    for (const item of order.items) {
      units.set(item.name, (units.get(item.name) ?? 0) + item.quantity)
    }
  }
  return [...units.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, units: count }))
}

export function computeRestaurantStats(
  restaurantId: string,
  orders: Order[],
  reviews: Review[],
): RestaurantStats {
  const ownOrders = orders.filter((order) => order.restaurantId === restaurantId)
  const ownReviews = reviews.filter((review) => review.restaurantId === restaurantId)
  const ratingTotal = sum(ownReviews, (review) => review.rating)

  return {
    restaurantId,
    totalOrders: ownOrders.length,
    ordersByStatus: countByStatus(ownOrders),
    revenue: roundMoney(sum(deliveredOnly(ownOrders), (order) => order.subtotal)),
    averageRating: ownReviews.length === 0 ? 0 : Math.round((ratingTotal / ownReviews.length) * 10) / 10,
    reviewsCount: ownReviews.length,
    topItems: topItems(ownOrders, 3),
  }
}

export interface AdminStatsInput {
  orders: Order[]
  users: Pick<User, 'role' | 'status'>[]
  restaurants: Restaurant[]
  reviews: Review[]
}

function lastDays(orders: Order[], now: Date, days: number): DailyOrderRevenue[] {
  const result: DailyOrderRevenue[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    // Dates in the fixtures are UTC ISO strings, so compare on the UTC calendar day.
    const date = new Date(now.getTime() - offset * DAY_MS).toISOString().slice(0, 10)
    const dayOrders = orders.filter((order) => order.createdAt.slice(0, 10) === date)
    result.push({
      date,
      orders: dayOrders.length,
      revenue: roundMoney(sum(deliveredOnly(dayOrders), (order) => order.total)),
    })
  }
  return result
}

function topRestaurants(orders: Order[], restaurants: Restaurant[], limit: number): TopRestaurant[] {
  return restaurants
    .map((restaurant) => {
      const own = orders.filter((order) => order.restaurantId === restaurant.id)
      return {
        restaurantId: restaurant.id,
        name: restaurant.name,
        orders: own.length,
        revenue: roundMoney(sum(deliveredOnly(own), (order) => order.total)),
      }
    })
    .filter((entry) => entry.orders > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export function computeAdminStats(
  { orders, users, restaurants, reviews }: AdminStatsInput,
  now: Date,
): AdminStats {
  const usersByRole: Record<UserRole, number> = { admin: 0, restaurant: 0, customer: 0 }
  for (const user of users) usersByRole[user.role] += 1

  return {
    totalOrders: orders.length,
    ordersByStatus: countByStatus(orders),
    totalRevenue: roundMoney(sum(deliveredOnly(orders), (order) => order.total)),
    usersByRole,
    suspendedUsers: users.filter((user) => user.status === 'suspended').length,
    activeRestaurants: restaurants.filter((restaurant) => restaurant.isActive).length,
    reportedReviews: reviews.filter((review) => review.isReported).length,
    last14Days: lastDays(orders, now, 14),
    topRestaurants: topRestaurants(orders, restaurants, 5),
  }
}
