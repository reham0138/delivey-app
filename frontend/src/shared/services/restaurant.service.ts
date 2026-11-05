import type { MenuItem, Restaurant } from '../types'

const RESTAURANTS_URL = '/mock/restaurants.json'
const MENU_ITEMS_URL = '/mock/menu-items.json'

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
): Restaurant[] {
  return restaurants
    .filter((restaurant) => restaurant.isActive)
    .map((restaurant) => {
      const reviewsCount = menuItems
        .filter((item) => item.restaurantId === restaurant.id)
        .reduce((total, item) => total + item.reviewsCount, 0)

      return { ...restaurant, reviewsCount }
    })
}

export const restaurantService = {
  async getAll(): Promise<Restaurant[]> {
    const { restaurants, menuItems } = await loadRestaurantData()
    return withReviewCounts(restaurants, menuItems)
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
