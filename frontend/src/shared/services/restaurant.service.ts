import type { MenuItem, Restaurant, RestaurantProfileChanges } from '../types'
import type { PaginatedResponse } from '../types'
import { adminState } from './adminState.service'
import { menuItemService } from './menuItem.service'
import { ApiError, apiRequest } from '@/shared/api/client'

const RESTAURANTS_URL = '/mock/restaurants.json'
const PROFILE_OVERRIDES_KEY = 'crown-anchor-restaurant-profile-overrides'

type ProfileOverrides = Record<string, Partial<RestaurantProfileChanges>>

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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Unable to load restaurant data (HTTP ${response.status}).`)
  }

  return (await response.json()) as T
}

interface RestaurantData {
  restaurants: Restaurant[]
  menuItems: MenuItem[]
}

async function loadRestaurantData(): Promise<RestaurantData> {
  const [restaurants, menuItems] = await Promise.all([
    fetchJson<Restaurant[]>(RESTAURANTS_URL),
    menuItemService.getAll(),
  ])

  return { restaurants, menuItems }
}

function withReviewCounts(
  restaurants: Restaurant[],
  menuItems: MenuItem[],
  includeInactive = false,
): Restaurant[] {
  const overrides = readProfileOverrides()

  return restaurants
    .map((restaurant) => {
      const withAdminStatus = {
        ...restaurant,
        isActive: adminState.getRestaurantIsActive(restaurant.id, restaurant.isActive),
      }
      const withProfileChanges = applyProfileChanges(
        withAdminStatus,
        overrides[String(withAdminStatus.id)] ?? {},
      )
      const reviewsCount = menuItems
        .filter((item) => item.restaurantId === withAdminStatus.id)
        .reduce((total, item) => total + item.reviewsCount, 0)

      return { ...withProfileChanges, reviewsCount }
    })
    .filter((restaurant) => includeInactive || restaurant.isActive)
}

function readProfileOverrides(): ProfileOverrides {
  try {
    const stored = window.localStorage.getItem(PROFILE_OVERRIDES_KEY)
    if (!stored) return {}

    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return parsed as ProfileOverrides
  } catch {
    return {}
  }
}

function saveProfileOverrides(overrides: ProfileOverrides): void {
  try {
    window.localStorage.setItem(PROFILE_OVERRIDES_KEY, JSON.stringify(overrides))
  } catch {
    throw new Error('Restaurant profile storage is unavailable.')
  }
}

function applyProfileChanges(
  restaurant: Restaurant,
  changes: Partial<RestaurantProfileChanges>,
): Restaurant {
  return {
    ...restaurant,
    ...(typeof changes.name === 'string' ? { name: changes.name } : {}),
    ...(typeof changes.cuisine === 'string' ? { cuisine: changes.cuisine } : {}),
    ...(typeof changes.address === 'string' ? { address: changes.address } : {}),
    ...(typeof changes.phone === 'string' ? { phone: changes.phone } : {}),
    ...(typeof changes.deliveryTimeMinutes === 'number' && Number.isFinite(changes.deliveryTimeMinutes)
      ? { deliveryTimeMinutes: changes.deliveryTimeMinutes }
      : {}),
    ...(typeof changes.deliveryFee === 'number' && Number.isFinite(changes.deliveryFee)
      ? { deliveryFee: changes.deliveryFee }
      : {}),
    ...(typeof changes.minOrder === 'number' && Number.isFinite(changes.minOrder)
      ? { minOrder: changes.minOrder }
      : {}),
    ...(typeof changes.image === 'string' ? { image: changes.image } : {}),
    ...(typeof changes.cover === 'string' ? { cover: changes.cover } : {}),
    ...(typeof changes.openingHours === 'string' ? { openingHours: changes.openingHours } : {}),
  }
}

export const restaurantService = {
  getAll,

  async getOwnedByOwnerId(ownerId: string): Promise<Restaurant | null> {
    const { restaurants, menuItems } = await loadRestaurantData()
    const ownedRestaurant = restaurants.find((restaurant) => restaurant.ownerId === ownerId)
    if (!ownedRestaurant) return null

    return withReviewCounts([ownedRestaurant], menuItems, true)[0] ?? null
  },

  async updateOwnedByOwnerId(
    ownerId: string,
    changes: RestaurantProfileChanges,
  ): Promise<Restaurant> {
    const { restaurants, menuItems } = await loadRestaurantData()
    const ownedRestaurant = restaurants.find((restaurant) => restaurant.ownerId === ownerId)
    if (!ownedRestaurant) {
      throw new Error('No restaurant profile is associated with this account.')
    }

    const overrides = readProfileOverrides()
    const key = String(ownedRestaurant.id)
    overrides[key] = { ...overrides[key], ...changes }
    saveProfileOverrides(overrides)

    const currentRestaurant = withReviewCounts([ownedRestaurant], menuItems, true)[0]
    if (!currentRestaurant) {
      throw new Error('The restaurant profile could not be loaded.')
    }
    return applyProfileChanges(currentRestaurant, changes)
  },

  async getMealById(id: string): Promise<{
    meal: MenuItem | null
    restaurant: Restaurant | null
  }> {
    let meal: MenuItem
    try {
      meal = await menuItemService.getById(id)
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

  async getById(id: string, query: RestaurantMenuQuery = { page: 1, limit: 50, sort: 'name' }): Promise<{
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

function getAll(): Promise<Restaurant[]>
function getAll(query: RestaurantListQuery): Promise<PaginatedResponse<Restaurant>>
async function getAll(
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

  const { restaurants, menuItems } = await loadRestaurantData()
  return withReviewCounts(restaurants, menuItems)
}
