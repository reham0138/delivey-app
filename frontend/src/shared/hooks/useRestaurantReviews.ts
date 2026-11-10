import { useCallback, useEffect, useState } from 'react'

import { reviewService } from '../services/review.service'
import type { Review } from '../types'

export function useRestaurantReviews(restaurantId: number | null) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (restaurantId === null || !Number.isInteger(restaurantId) || restaurantId < 1) {
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
