import type { MenuItem, Order, OrderStatus, Restaurant, Review } from '@/shared/types'

export interface RestaurantDashboardData {
  restaurant: Restaurant | null
  meals: MenuItem[]
  orders: Order[]
  reviews: Review[]
}

export interface DashboardActionProps {
  busy: boolean
  actionError: string
  clearActionError: () => void
}

export type MealChanges = Pick<
  MenuItem,
  | 'name'
  | 'description'
  | 'price'
  | 'category'
  | 'image'
  | 'ingredients'
  | 'preparationTimeMinutes'
  | 'isAvailable'
  | 'isPopular'
>

export type DashboardTabId = 'overview' | 'meals' | 'orders' | 'reviews'

export interface RestaurantDashboardTabsProps {
  data: RestaurantDashboardData
  busy: boolean
  actionError: string
  clearActionError: () => void
  onSelectTab: (tab: DashboardTabId) => void
  onSaveMeal: (meal: MenuItem | null, changes: MealChanges) => Promise<boolean>
  onDeleteMeal: (meal: MenuItem) => Promise<boolean>
  onUpdateOrder: (orderId: string, status: OrderStatus) => void
  onReportReview: (review: Review, reason: string) => Promise<boolean>
}
