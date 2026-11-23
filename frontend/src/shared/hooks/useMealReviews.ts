import { useCallback, useEffect, useState } from 'react'

import { reviewService } from '../services/review.service'
import type { Review } from '../types'

export function useMealReviews(menuItemId: string | null) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (menuItemId === null || !/^[A-Za-z0-9_-]+$/.test(menuItemId)) {
      setReviews([])
      setIsLoading(false)
      setError('')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      setReviews(await reviewService.getByMealId(menuItemId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }, [menuItemId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { reviews, isLoading, error, reload }
}
