import { useCallback } from 'react'
import { useFetch } from '@/shared/hooks/useFetch'
import { adminService } from '@/shared/services/admin.service'
import type {
  AdminMealListQuery,
  AdminRestaurantListQuery,
} from '@/shared/services/admin.service'

export function useAdminUsers() {
  const fetcher = useCallback(() => adminService.listUsers(), [])
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