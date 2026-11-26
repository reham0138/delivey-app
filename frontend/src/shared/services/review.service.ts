import { apiRequest, ApiError } from '@/shared/api/client'
import type { Order, PaginatedResponse, Review } from '@/shared/types'

const PAGE_LIMIT = 50

async function listAllPages(path: string): Promise<Review[]> {
  const firstPage = await apiRequest<PaginatedResponse<Review>>(path, {
    query: { page: 1, limit: PAGE_LIMIT },
  })
  const data = [...firstPage.data]
  for (let page = 2; page <= firstPage.meta.total_pages; page += 1) {
    const next = await apiRequest<PaginatedResponse<Review>>(path, {
      query: { page, limit: PAGE_LIMIT },
    })
    data.push(...next.data)
  }
  return data
}

export const reviewService = {
  /** Public reviews for a meal (hidden and reported reviews are excluded server-side). */
  async getByMealId(
    menuItemId: string,
    // kept for call-site compatibility; the public endpoint never returns reported reviews
    _options: { includeReported?: boolean } = {},
  ): Promise<Review[]> {
    void _options
    return listAllPages(`/menu-items/${encodeURIComponent(menuItemId)}/reviews`)
  },

  /** Public reviews for a restaurant (hidden and reported reviews are excluded server-side). */
  async getByRestaurantId(
    restaurantId: string,
    _options: { includeReported?: boolean } = {},
  ): Promise<Review[]> {
    void _options
    return listAllPages(`/restaurants/${encodeURIComponent(restaurantId)}/reviews`)
  },

  /** The signed-in customer's own review for a meal; null when they have not reviewed it. */
  async getCustomerMealReview(_customerId: string, menuItemId: string): Promise<Review | null> {
    void _customerId // the token identifies the customer
    try {
      return await apiRequest<Review>(`/menu-items/${encodeURIComponent(menuItemId)}/reviews/mine`)
    } catch (failure) {
      if (failure instanceof ApiError && failure.statusCode === 404) return null
      throw failure
    }
  },

  async createReview(
    order: Order,
    _customerName: string,
    menuItemId: string,
    rating: number,
    comment: string,
  ): Promise<Review> {
    void _customerName // the server derives the customer from the token and the order
    const trimmed = comment.trim()
    return apiRequest<Review>('/reviews', {
      method: 'POST',
      body: {
        orderId: order.id,
        menuItemId,
        rating,
        ...(trimmed ? { comment: trimmed } : {}),
      },
    })
  },
}
