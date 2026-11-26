import { apiRequest } from '@/shared/api/client'
import { adminOrdersService } from '@/shared/services/adminOrders.service'
import type { AdminOrderRow } from '@/shared/services/adminOrders.service'
import type { AdminStats } from '@/shared/types'

const RECENT_ORDERS_LIMIT = 8

export interface AdminOverview {
  stats: AdminStats
  /** Newest orders first — used for the recent-orders table. */
  orders: AdminOrderRow[]
}

export const dashboardService = {
  async getAdminOverview(): Promise<AdminOverview> {
    const [stats, ordersPage] = await Promise.all([
      apiRequest<AdminStats>('/admin/stats'),
      adminOrdersService.listOrdersPage({ page: 1, limit: RECENT_ORDERS_LIMIT }),
    ])
    return { stats, orders: ordersPage.data }
  },
}
