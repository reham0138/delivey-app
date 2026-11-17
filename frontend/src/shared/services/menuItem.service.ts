import type { MenuItem } from '@/shared/types'

const STORAGE_KEY = 'crown-anchor-menu-item-availability'
const MENU_ITEMS_URL = '/mock/menu-items.json'

type AvailabilityOverrides = Record<string, boolean>

async function fetchMenuItems(): Promise<MenuItem[]> {
  const response = await fetch(MENU_ITEMS_URL)
  if (!response.ok) throw new Error(`Unable to load meals (HTTP ${response.status}).`)
  return response.json() as Promise<MenuItem[]>
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

export const menuItemService = {
  async getAll(): Promise<MenuItem[]> {
    const items = await fetchMenuItems()
    const overrides = readAvailabilityOverrides()
    return items.map((item) => ({
      ...item,
      isAvailable: overrides[String(item.id)] ?? item.isAvailable,
    }))
  },

  async setAvailability(id: number, isAvailable: boolean): Promise<void> {
    const items = await fetchMenuItems()
    if (!items.some((item) => item.id === id)) throw new Error('Meal not found.')
    const overrides = readAvailabilityOverrides()
    saveAvailabilityOverrides({ ...overrides, [id]: isAvailable })
  },
}
