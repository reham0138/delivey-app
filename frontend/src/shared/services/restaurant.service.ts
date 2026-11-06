import type { MenuItem, Restaurant, RestaurantProfileChanges } from '../types'

const RESTAURANTS_URL = '/mock/restaurants.json'
const MENU_ITEMS_URL = '/mock/menu-items.json'
const PROFILE_OVERRIDES_KEY = 'crown-anchor-restaurant-profile-overrides'

type ProfileOverrides = Record<string, Partial<RestaurantProfileChanges>>

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Unable to load restaurant data (HTTP ${response.status}).`)
  }

  return response.json() as Promise<T>
}

interface RestaurantData {
  restaurants: Restaurant[]
  menuItems: MenuItem[]
}

async function loadRestaurantData(): Promise<RestaurantData> {
  const [restaurants, menuItems] = await Promise.all([
    fetchJson<Restaurant[]>(RESTAURANTS_URL),
    fetchJson<MenuItem[]>(MENU_ITEMS_URL),
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
    .filter((restaurant) => includeInactive || restaurant.isActive)
    .map((restaurant) => {
      const withProfileChanges = applyProfileChanges(
        restaurant,
        overrides[String(restaurant.id)] ?? {},
      )
      const reviewsCount = menuItems
        .filter((item) => item.restaurantId === restaurant.id)
        .reduce((total, item) => total + item.reviewsCount, 0)

      return { ...withProfileChanges, reviewsCount }
    })
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
  async getAll(): Promise<Restaurant[]> {
    const { restaurants, menuItems } = await loadRestaurantData()
    return withReviewCounts(restaurants, menuItems)
  },

  async getOwnedByOwnerId(ownerId: number): Promise<Restaurant | null> {
    const { restaurants, menuItems } = await loadRestaurantData()
    const ownedRestaurant = restaurants.find((restaurant) => restaurant.ownerId === ownerId)
    if (!ownedRestaurant) return null

    return withReviewCounts([ownedRestaurant], menuItems, true)[0] ?? null
  },

  async updateOwnedByOwnerId(
    ownerId: number,
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

  async getById(id: number): Promise<{
    restaurant: Restaurant | null
    meals: MenuItem[]
  }> {
    const { restaurants, menuItems } = await loadRestaurantData()
    const restaurant = withReviewCounts(restaurants, menuItems)
      .find((item) => item.id === id) ?? null

    return {
      restaurant,
      meals: restaurant
        ? menuItems.filter(
            (item) => item.restaurantId === id && item.isAvailable,
          )
        : [],
    }
  },
}
