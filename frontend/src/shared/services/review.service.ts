import { apiRequest, ApiError } from '@/shared/api/client'
import type { Order, PaginatedResponse, Review } from '@/shared/types'
import { normalizeMockIds } from '@/shared/utils/normalizeMockIds'

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

  // TODO remove in the admin-reviews phase — mock-only, still used by admin.service.
  async listAll(): Promise<Review[]> {
    return (await getAllMock()).sort((first, second) => second.createdAt.localeCompare(first.createdAt))
  },

  // TODO remove in the admin-reviews phase — mock-only, still used by admin.service.
  async deleteReview(id: string): Promise<void> {
    const reviews = await getAllMock()
    const remaining = reviews.filter(review => review.id !== id)
    if (remaining.length === reviews.length) throw new Error('Review not found.')
    localStorage.setItem(MOCK_REVIEWS_KEY, JSON.stringify(remaining))
  },
}

// Mock-only adapter kept until the admin reviews page moves to the real API.
const MOCK_REVIEWS_KEY = 'crown-anchor-reviews'

async function getAllMock(): Promise<Review[]> {
  try {
    const stored = localStorage.getItem(MOCK_REVIEWS_KEY)
    if (stored) return JSON.parse(stored) as Review[]
  } catch { /* load the fixture if local storage is unavailable or malformed */ }
  const response = await fetch('/mock/reviews.json')
  if (!response.ok) throw new Error('Could not load reviews.')
  const reviews = normalizeMockIds(await response.json() as Review[])
  try { localStorage.setItem(MOCK_REVIEWS_KEY, JSON.stringify(reviews)) } catch { /* keep the current session usable */ }
  return reviews
}
