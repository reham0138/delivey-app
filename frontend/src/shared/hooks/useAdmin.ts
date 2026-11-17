import { useCallback } from 'react'
import { useFetch } from '@/shared/hooks/useFetch'
import { adminService } from '@/shared/services/admin.service'

export function useAdminUsers() {
  const fetcher = useCallback(() => adminService.listUsers(), [])
  return useFetch(fetcher)
}