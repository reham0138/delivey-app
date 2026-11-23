import { useCallback, useEffect, useState } from 'react'

import { restaurantService } from '../services/restaurant.service'
import type { MenuItem, PaginationMeta, Restaurant } from '../types'
import type { RestaurantListQuery, RestaurantMenuQuery } from '../services/restaurant.service'

interface AsyncState<T> {
  data: T
  loading: boolean
  error: string
  refetch: () => Promise<void>
  meta?: PaginationMeta
}

export function useRestaurants(
  ownerId?: string,
  query?: RestaurantListQuery,
): AsyncState<Restaurant[]> {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [meta, setMeta] = useState<PaginationMeta>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const page = query?.page
  const limit = query?.limit
  const search = query?.search
  const cuisine = query?.cuisine
  const minRating = query?.minRating
  const isOpen = query?.isOpen
  const sort = query?.sort

  const refetch = useCallback(async () => {
    setLoading(true)
    setError('')
    setMeta(undefined)

    try {
      if (ownerId === undefined) {
        if (page !== undefined && limit !== undefined && sort !== undefined) {
          const result = await restaurantService.getAll({
            page,
            limit,
            search,
            cuisine,
            minRating,
            isOpen,
            sort,
          })
          setRestaurants(result.data)
          setMeta(result.meta)
        } else {
          setRestaurants(await restaurantService.getAll())
        }
      } else {
        const ownedRestaurant = await restaurantService.getOwnedByOwnerId(ownerId)
        setRestaurants(ownedRestaurant ? [ownedRestaurant] : [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [ownerId, page, limit, search, cuisine, minRating, isOpen, sort])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data: restaurants, loading, error, refetch, meta }
}

interface RestaurantDetails {
  restaurant: Restaurant | null
  meals: MenuItem[]
  meta?: PaginationMeta
}

export function useRestaurant(
  id: string | null,
  query?: RestaurantMenuQuery,
): AsyncState<RestaurantDetails> {
  const [data, setData] = useState<RestaurantDetails>({
    restaurant: null,
    meals: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const page = query?.page
  const limit = query?.limit
  const search = query?.search
  const category = query?.category
  const sort = query?.sort

  const refetch = useCallback(async () => {
    if (id === null || !/^[A-Za-z0-9_-]+$/.test(id)) {
      setData({ restaurant: null, meals: [], meta: undefined })
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = page !== undefined && limit !== undefined && sort !== undefined
        ? await restaurantService.getById(id, { page, limit, search, category, sort })
        : await restaurantService.getById(id)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [id, page, limit, search, category, sort])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

interface MealDetails {
  meal: MenuItem | null
  restaurant: Restaurant | null
}

export function useMeal(id: string | null): AsyncState<MealDetails> {
  const [data, setData] = useState<MealDetails>({
    meal: null,
    restaurant: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refetch = useCallback(async () => {
    if (id === null || !/^[A-Za-z0-9_-]+$/.test(id)) {
      setData({ meal: null, restaurant: null })
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')

    try {
      setData(await restaurantService.getMealById(id))
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
