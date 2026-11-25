import { useCallback } from 'react'
import { useFetch } from '@/shared/hooks/useFetch'
import { adminService } from '@/shared/services/admin.service'
import { adminUsersService } from '@/shared/services/adminUsers.service'
import type {
  AdminMealListQuery,
  AdminRestaurantListQuery,
} from '@/shared/services/admin.service'
import type { AdminUsersListQuery } from '@/shared/services/adminUsers.service'

export function useAdminUsers(query: AdminUsersListQuery) {
  const fetcher = useCallback(() => adminUsersService.listUsers(query), [query])
  return useFetch(fetcher)
}

export function useAdminRestaurants(query: AdminRestaurantListQuery) {
  const fetcher = useCallback(() => adminService.listRestaurantsPage(query), [query])
  return useFetch(fetcher)
}

export function useAdminReviews() {
  const fetcher = useCallback(() => adminService.listReviews(), [])
  return useFetch(fetcher)
}

export function useAdminOrders() {
  const fetcher = useCallback(() => adminService.listOrders(), [])
  return useFetch(fetcher)
}

export function useAdminMeals(query: AdminMealListQuery) {
  const fetcher = useCallback(() => adminService.listMealsPage(query), [query])
  return useFetch(fetcher)
}