import { useCallback } from 'react'
import { useFetch } from '@/shared/hooks/useFetch'
import { adminService } from '@/shared/services/admin.service'
import { adminUsersService } from '@/shared/services/adminUsers.service'
import { adminOrdersService } from '@/shared/services/adminOrders.service'
import { adminReviewsService } from '@/shared/services/adminReviews.service'
import type {
  AdminMealListQuery,
  AdminRestaurantListQuery,
} from '@/shared/services/admin.service'
import type { AdminUsersListQuery } from '@/shared/services/adminUsers.service'
import type { AdminOrdersListQuery } from '@/shared/services/adminOrders.service'
import type { AdminReviewsListQuery } from '@/shared/services/adminReviews.service'

export function useAdminUsers(query: AdminUsersListQuery) {
  const fetcher = useCallback(() => adminUsersService.listUsers(query), [query])
  return useFetch(fetcher)
}

export function useAdminRestaurants(query: AdminRestaurantListQuery) {
  const fetcher = useCallback(() => adminService.listRestaurantsPage(query), [query])
  return useFetch(fetcher)
}

export function useAdminReviews(query: AdminReviewsListQuery) {
  const fetcher = useCallback(() => adminReviewsService.listReviewsPage(query), [query])
  return useFetch(fetcher)
}

export function useAdminReviewLookups() {
  const fetcher = useCallback(() => adminReviewsService.listLookups(), [])
  return useFetch(fetcher)
}

export function useAdminOrders(query: AdminOrdersListQuery) {
  const fetcher = useCallback(() => adminOrdersService.listOrdersPage(query), [query])
  return useFetch(fetcher)
}

export function useAdminOrderRestaurants() {
  const fetcher = useCallback(() => adminOrdersService.listRestaurantOptions(), [])
  return useFetch(fetcher)
}

export function useAdminMeals(query: AdminMealListQuery) {
  const fetcher = useCallback(() => adminService.listMealsPage(query), [query])
  return useFetch(fetcher)
}