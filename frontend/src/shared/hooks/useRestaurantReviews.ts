import { useCallback, useEffect, useState } from 'react'

import { reviewService } from '../services/review.service'
import type { Review } from '../types'

export function useRestaurantReviews(restaurantId: string | null) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (restaurantId === null || !/^[A-Za-z0-9_-]+$/.test(restaurantId)) {
      setReviews([])
      setIsLoading(false)
      setError('')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      setReviews(await reviewService.getByRestaurantId(restaurantId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { reviews, isLoading, error, reload }
}
