import { ApiError, apiRequest } from '@/shared/api/client'
import type { MenuItem, PaginatedResponse, Restaurant, RestaurantProfileChanges } from '../types'

const PAGE_LIMIT = 50

export interface RestaurantListQuery {
  page: number
  limit: number
  search?: string
  cuisine?: string
  minRating?: number
  isOpen?: boolean
  sort: 'rating' | 'deliveryTime' | 'deliveryFee' | 'name'
}

export interface RestaurantMenuQuery {
  page: number
  limit: number
  search?: string
  category?: string
  sort: 'popular' | 'rating' | 'price_asc' | 'name'
}

async function getAllPages<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined>,
): Promise<T[]> {
  const firstPage = await apiRequest<PaginatedResponse<T>>(path, {
    query: { ...query, page: 1, limit: PAGE_LIMIT },
  })
  const data = [...firstPage.data]
  for (let page = 2; page <= firstPage.meta.total_pages; page += 1) {
    const result = await apiRequest<PaginatedResponse<T>>(path, {
      query: { ...query, page, limit: PAGE_LIMIT },
    })
    data.push(...result.data)
  }
  return data
}

async function getRestaurants(): Promise<Restaurant[]>
async function getRestaurants(query: RestaurantListQuery): Promise<PaginatedResponse<Restaurant>>
async function getRestaurants(
  query?: RestaurantListQuery,
): Promise<Restaurant[] | PaginatedResponse<Restaurant>> {
  if (query) {
    return apiRequest<PaginatedResponse<Restaurant>>('/restaurants', {
      query: {
        page: query.page,
        limit: query.limit,
        search: query.search,
        cuisine: query.cuisine,
        minRating: query.minRating,
        isOpen: query.isOpen,
        sort: query.sort,
      },
    })
  }
  return getAllPages<Restaurant>('/restaurants', { sort: 'rating' })
}

export const restaurantService = {
  getAll: getRestaurants,

  async getOwnedByOwnerId(ownerId: string): Promise<Restaurant | null> {
    void ownerId
    try {
      return await apiRequest<Restaurant>('/restaurant/me')
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) return null
      throw error
    }
  },

  async updateOwnedByOwnerId(
    _ownerId: string,
    changes: RestaurantProfileChanges,
  ): Promise<Restaurant> {
    return apiRequest<Restaurant>('/restaurant/me', {
      method: 'PATCH',
      body: changes,
    })
  },

  async getMealById(id: string): Promise<{
    meal: MenuItem | null
    restaurant: Restaurant | null
  }> {
    let meal: MenuItem
    try {
      meal = await apiRequest<MenuItem>(`/menu-items/${encodeURIComponent(id)}`)
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return { meal: null, restaurant: null }
      }
      throw error
    }

    let restaurant: Restaurant | null
    try {
      restaurant = await apiRequest<Restaurant>(
        `/restaurants/${encodeURIComponent(meal.restaurantId)}`,
      )
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return { meal, restaurant: null }
      }
      throw error
    }
    return { meal, restaurant }
  },

  async getById(
    id: string,
    query: RestaurantMenuQuery = { page: 1, limit: PAGE_LIMIT, sort: 'name' },
  ): Promise<{
    restaurant: Restaurant | null
    meals: MenuItem[]
    meta: PaginatedResponse<MenuItem>['meta']
  }> {
    try {
      const [restaurant, menuPage] = await Promise.all([
        apiRequest<Restaurant>(`/restaurants/${encodeURIComponent(id)}`),
        apiRequest<PaginatedResponse<MenuItem>>(
          `/restaurants/${encodeURIComponent(id)}/menu-items`,
          {
            query: {
              page: query.page,
              limit: query.limit,
              search: query.search,
              category: query.category,
              sort: query.sort,
            },
          },
        ),
      ])
      return {
        restaurant,
        meals: menuPage.data,
        meta: menuPage.meta,
      }
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return {
          restaurant: null,
          meals: [],
          meta: { total: 0, page: query.page, limit: query.limit, total_pages: 1 },
        }
      }
      throw error
    }
  },
}
