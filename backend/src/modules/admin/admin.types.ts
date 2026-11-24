import type { AccountStatus, OrderStatus, Role } from '../../common/enums'

// Contract 3.11 — never includes passwordHash, addresses or other internals.
export interface AdminUserRow {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  status: AccountStatus
  createdAt: Date
}

export interface AdminStats {
  totalOrders: number
  ordersByStatus: Partial<Record<OrderStatus, number>>
  totalRevenue: number
  usersByRole: Partial<Record<Role, number>>
  suspendedUsers: number
  activeRestaurants: number
  reportedReviews: number
  last14Days: { date: string; orders: number; revenue: number }[]
  topRestaurants: { restaurantId: string; name: string; orders: number; revenue: number }[]
}
