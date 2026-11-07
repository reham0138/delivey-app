import { useCallback, useEffect, useState } from 'react'

import { restaurantService } from '../services/restaurant.service'
import type { MenuItem, Restaurant } from '../types'

interface AsyncState<T> {
  data: T
  loading: boolean
  error: string
  refetch: () => Promise<void>
}

export function useRestaurants(ownerId?: number): AsyncState<Restaurant[]> {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refetch = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (ownerId === undefined) {
        setRestaurants(await restaurantService.getAll())
      } else {
        const ownedRestaurant = await restaurantService.getOwnedByOwnerId(ownerId)
        setRestaurants(ownedRestaurant ? [ownedRestaurant] : [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data: restaurants, loading, error, refetch }
}

interface RestaurantDetails {
  restaurant: Restaurant | null
  meals: MenuItem[]
}

export function useRestaurant(id: number | null): AsyncState<RestaurantDetails> {
  const [data, setData] = useState<RestaurantDetails>({
    restaurant: null,
    meals: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refetch = useCallback(async () => {
    if (id === null || !Number.isInteger(id) || id < 1) {
      setData({ restaurant: null, meals: [] })
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')

    try {
      setData(await restaurantService.getById(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
