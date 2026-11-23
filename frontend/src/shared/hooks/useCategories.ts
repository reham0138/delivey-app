import { useCallback, useEffect, useState } from 'react'

import { categoryService } from '../services/category.service'
import type { Category } from '../types'

interface CategoriesState {
  data: Category[]
  loading: boolean
  error: string
  refetch: () => Promise<void>
}

export function useCategories(): CategoriesState {
  const [data, setData] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refetch = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await categoryService.getAll())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
