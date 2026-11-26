import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('@/shared/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/client')>()
  return { ...actual, apiRequest }
})

import { adminReviewsService } from '@/shared/services/adminReviews.service'
import type { AdminReviewRow } from '@/shared/services/adminReviews.service'
import { ApiError } from '@/shared/api/client'
import type { PaginatedResponse } from '@/shared/types'

function review(overrides: Partial<AdminReviewRow> = {}): AdminReviewRow {
  return {
    id: 'rev-1',
    customerId: 'cust-1',
    customerName: 'Layla',
    restaurantId: 'rest-1',
    menuItemId: 'meal-1',
    orderId: 'ord-1',
    rating: 5,
    comment: 'Great!',
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: null,
    isReported: false,
    reportReason: null,
    isHidden: false,
    ...overrides,
  }
}

function page(data: AdminReviewRow[], total = data.length): PaginatedResponse<AdminReviewRow> {
  return { data, meta: { total, page: 1, limit: 8, total_pages: Math.ceil(total / 8) } }
}

beforeEach(() => {
  apiRequest.mockReset()
})

describe('adminReviewsService.listReviewsPage', () => {
  it('passes reported/isHidden filters and pagination to the API', async () => {
    apiRequest.mockResolvedValueOnce(page([review()]))
    const result = await adminReviewsService.listReviewsPage({ page: 2, limit: 8, reported: true, isHidden: false })
    expect(apiRequest).toHaveBeenCalledWith('/admin/reviews', {
      query: { page: 2, limit: 8, reported: true, isHidden: false },
    })
    expect(result.data).toHaveLength(1)
  })

  it('returns an empty page with zeroed meta', async () => {
    apiRequest.mockResolvedValueOnce({ data: [], meta: { total: 0, page: 1, limit: 8, total_pages: 0 } })
    const result = await adminReviewsService.listReviewsPage({ page: 1, limit: 8 })
    expect(result.data).toEqual([])
    expect(result.meta.total).toBe(0)
  })

  it('propagates ApiError codes', async () => {
    apiRequest.mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Admins only'))
    await expect(adminReviewsService.listReviewsPage({ page: 1, limit: 8 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})

describe('adminReviewsService actions', () => {
  it('hides a review via POST /admin/reviews/:id/hide', async () => {
    apiRequest.mockResolvedValueOnce(review({ isHidden: true }))
    await adminReviewsService.hideReview('rev-1')
    expect(apiRequest).toHaveBeenCalledWith('/admin/reviews/rev-1/hide', { method: 'POST' })
  })

  it('dismisses a report via POST /admin/reviews/:id/dismiss-report', async () => {
    apiRequest.mockResolvedValueOnce(review({ isReported: false }))
    await adminReviewsService.dismissReport('rev-1')
    expect(apiRequest).toHaveBeenCalledWith('/admin/reviews/rev-1/dismiss-report', { method: 'POST' })
  })

  it('propagates NOT_FOUND on hide', async () => {
    apiRequest.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'Review not found'))
    await expect(adminReviewsService.hideReview('gone')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('adminReviewsService.listLookups', () => {
  it('fetches all pages of restaurants and menu items', async () => {
    apiRequest
      .mockResolvedValueOnce({
        data: [{ id: 'r1', name: 'Restaurant One' }],
        meta: { total: 51, page: 1, limit: 50, total_pages: 2 },
      })
      .mockResolvedValueOnce({
        data: [{ id: 'm1', name: 'Meal One' }],
        meta: { total: 1, page: 1, limit: 50, total_pages: 1 },
      })
      .mockResolvedValueOnce({
        data: [{ id: 'r2', name: 'Restaurant Two' }],
        meta: { total: 51, page: 2, limit: 50, total_pages: 2 },
      })

    const lookups = await adminReviewsService.listLookups()
    expect(lookups.restaurants).toEqual([
      { id: 'r1', name: 'Restaurant One' },
      { id: 'r2', name: 'Restaurant Two' },
    ])
    expect(lookups.meals).toEqual([{ id: 'm1', name: 'Meal One' }])
    expect(apiRequest).toHaveBeenCalledTimes(3)
  })
})
