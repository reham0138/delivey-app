import { useCallback } from 'react'
import { useFetch } from '@/shared/hooks/useFetch'
import { dashboardService } from '@/shared/services/dashboard.service'

export function useRestaurantOverview(ownerId: number) {
  const fetcher = useCallback(() => dashboardService.getRestaurantOverview(ownerId), [ownerId])
  return useFetch(fetcher)
}

export function useAdminOverview() {
  const fetcher = useCallback(() => dashboardService.getAdminOverview(), [])
  return useFetch(fetcher)
}
