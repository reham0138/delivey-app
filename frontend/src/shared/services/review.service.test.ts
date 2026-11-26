import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reviewService } from '@/shared/services/review.service'
import { apiRequest, ApiError } from '@/shared/api/client'
import type { Order, Review } from '@/shared/types'
import type { PaginatedResponse } from '@/shared/types'

vi.mock('@/shared/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/client')>()
  return { ...actual, apiRequest: vi.fn() }
})

const apiRequestMock = vi.mocked(apiRequest)

const review: Review = {
  id: '64b0f1c2e4b0a1d2c3e4f601',
  menuItemId: '64b0f1c2e4b0a1d2c3e4f502',
  restaurantId: '64b0f1c2e4b0a1d2c3e4f503',
  customerId: '64b0f1c2e4b0a1d2c3e4f504',
  customerName: 'Layla Hassan',
  orderId: '64b0f1c2e4b0a1d2c3e4f505',
  rating: 5,
  comment: 'Great meal',
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: null,
  isReported: false,
  reportReason: null,
}

const order = { id: review.orderId } as Order

function reviewPage(rows: Review[], page = 1, totalPages = 1): PaginatedResponse<Review> {
  return { data: rows, meta: { total: rows.length, page, limit: 50, total_pages: totalPages } }
}

describe('reviewService.getByMealId / getByRestaurantId', () => {
  beforeEach(() => apiRequestMock.mockReset())

  it('fetches all pages of public meal reviews', async () => {
    const other = { ...review, id: 'other' }
    apiRequestMock
      .mockResolvedValueOnce(reviewPage([review], 1, 2))
      .mockResolvedValueOnce({ data: [other], meta: { total: 2, page: 2, limit: 50, total_pages: 2 } })

    const result = await reviewService.getByMealId(review.menuItemId)

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, `/menu-items/${review.menuItemId}/reviews`, {
      query: { page: 1, limit: 50 },
    })
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, `/menu-items/${review.menuItemId}/reviews`, {
      query: { page: 2, limit: 50 },
    })
    expect(result).toEqual([review, other])
  })

  it('fetches public restaurant reviews', async () => {
    apiRequestMock.mockResolvedValue(reviewPage([review]))

    await reviewService.getByRestaurantId(review.restaurantId)

    expect(apiRequestMock).toHaveBeenCalledWith(`/restaurants/${review.restaurantId}/reviews`, {
      query: { page: 1, limit: 50 },
    })
  })

  it('propagates errors', async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'Menu item not found'))
    await expect(reviewService.getByMealId('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('reviewService.getCustomerMealReview', () => {
  beforeEach(() => apiRequestMock.mockReset())

  it('returns the customer review', async () => {
    apiRequestMock.mockResolvedValue(review)

    const result = await reviewService.getCustomerMealReview('anyone', review.menuItemId)

    expect(apiRequestMock).toHaveBeenCalledWith(`/menu-items/${review.menuItemId}/reviews/mine`)
    expect(result).toEqual(review)
  })

  it('maps 404 to null (no review yet)', async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'Review not found'))

    await expect(reviewService.getCustomerMealReview('u', review.menuItemId)).resolves.toBeNull()
  })

  it('propagates non-404 errors', async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Unauthorized'))
    await expect(reviewService.getCustomerMealReview('u', review.menuItemId)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })
})

describe('reviewService.createReview', () => {
  beforeEach(() => apiRequestMock.mockReset())

  it('posts the slim review body and returns the created review', async () => {
    apiRequestMock.mockResolvedValue(review)

    const result = await reviewService.createReview(order, 'Layla', review.menuItemId, 4, '  Tasty!  ')

    expect(apiRequestMock).toHaveBeenCalledWith('/reviews', {
      method: 'POST',
      body: { orderId: order.id, menuItemId: review.menuItemId, rating: 4, comment: 'Tasty!' },
    })
    expect(result).toEqual(review)
  })

  it('omits an empty comment', async () => {
    apiRequestMock.mockResolvedValue(review)

    await reviewService.createReview(order, 'Layla', review.menuItemId, 5, '   ')

    expect(apiRequestMock).toHaveBeenCalledWith('/reviews', {
      method: 'POST',
      body: { orderId: order.id, menuItemId: review.menuItemId, rating: 5 },
    })
  })

  it('propagates REVIEW_NOT_ELIGIBLE and REVIEW_ALREADY_EXISTS', async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError(400, 'REVIEW_NOT_ELIGIBLE', 'Order is not eligible for review'))
    await expect(
      reviewService.createReview(order, 'Layla', review.menuItemId, 5, ''),
    ).rejects.toMatchObject({ code: 'REVIEW_NOT_ELIGIBLE' })

    apiRequestMock.mockRejectedValueOnce(new ApiError(409, 'REVIEW_ALREADY_EXISTS', 'Already reviewed'))
    await expect(
      reviewService.createReview(order, 'Layla', review.menuItemId, 5, ''),
    ).rejects.toMatchObject({ code: 'REVIEW_ALREADY_EXISTS' })
  })
})
