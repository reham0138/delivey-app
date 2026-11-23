import type { MenuItem, PaginatedResponse } from '@/shared/types'
import { apiRequest } from '@/shared/api/client'

const STORAGE_KEY = 'crown-anchor-menu-item-availability'
const MENU_ITEMS_URL = '/mock/menu-items.json'

type AvailabilityOverrides = Record<string, boolean>

export interface MenuItemListQuery {
  page: number
  limit: number
  search?: string
  restaurantId?: string
  category?: string
  openOnly?: boolean
  sort: 'popular' | 'rating' | 'price_asc' | 'price_desc' | 'name'
}

async function fetchMenuItems(): Promise<MenuItem[]> {
  const response = await fetch(MENU_ITEMS_URL)
  if (!response.ok) throw new Error(`Unable to load meals (HTTP ${response.status}).`)
  return (await response.json()) as MenuItem[]
}

function readAvailabilityOverrides(): AvailabilityOverrides {
  let stored: string | null
  try {
    stored = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    throw new Error('Menu availability storage is unavailable.')
  }
  if (!stored) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch {
    throw new Error('Stored menu availability is invalid.')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Stored menu availability is invalid.')
  }

  const overrides: AvailabilityOverrides = {}
  for (const [id, value] of Object.entries(parsed)) {
    if (typeof value === 'boolean') overrides[id] = value
  }
  return overrides
}

function saveAvailabilityOverrides(overrides: AvailabilityOverrides): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    throw new Error('Menu availability could not be saved.')
  }
}

async function getAll(): Promise<MenuItem[]>
async function getAll(query: MenuItemListQuery): Promise<PaginatedResponse<MenuItem>>
async function getAll(query?: MenuItemListQuery): Promise<MenuItem[] | PaginatedResponse<MenuItem>> {
  if (query) {
    return apiRequest<PaginatedResponse<MenuItem>>('/menu-items', {
      query: {
        page: query.page,
        limit: query.limit,
        search: query.search,
        restaurantId: query.restaurantId,
        category: query.category,
        openOnly: query.openOnly,
        sort: query.sort,
      },
    })
  }

  const items = await fetchMenuItems()
  const overrides = readAvailabilityOverrides()
  return items.map((item) => ({
    ...item,
    isAvailable: overrides[String(item.id)] ?? item.isAvailable,
  }))
}

export const menuItemService = {
  getAll,

  async getById(id: string): Promise<MenuItem> {
    return apiRequest<MenuItem>(`/menu-items/${encodeURIComponent(id)}`)
  },

  async setAvailability(id: string, isAvailable: boolean): Promise<void> {
    const items = await fetchMenuItems()
    if (!items.some((item) => item.id === id)) throw new Error('Meal not found.')
    const overrides = readAvailabilityOverrides()
    saveAvailabilityOverrides({ ...overrides, [id]: isAvailable })
  },
}
