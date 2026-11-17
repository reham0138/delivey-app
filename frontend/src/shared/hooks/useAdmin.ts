import { useCallback } from 'react'
import { useFetch } from '@/shared/hooks/useFetch'
import { adminService } from '@/shared/services/admin.service'

export function useAdminUsers() {
  const fetcher = useCallback(() => adminService.listUsers(), [])
  return useFetch(fetcher)
}

export function useAdminRestaurants() {
  const fetcher = useCallback(() => adminService.listRestaurants(), [])
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

export function useAdminMeals() {
  const fetcher = useCallback(() => adminService.listMeals(), [])
  return useFetch(fetcher)
}