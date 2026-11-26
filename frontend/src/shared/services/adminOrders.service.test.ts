import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminOrdersService } from '@/shared/services/adminOrders.service'
import { apiRequest, ApiError } from '@/shared/api/client'
import type { Order } from '@/shared/types'
import type { PaginatedResponse } from '@/shared/types'

vi.mock('@/shared/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/client')>()
  return { ...actual, apiRequest: vi.fn() }
})

const apiRequestMock = vi.mocked(apiRequest)

const order = { id: '64b0f1c2e4b0a1d2c3e4f701', status: 'pending' } as Order

function orderPage(rows: Order[], page = 1, totalPages = 1): PaginatedResponse<Order> {
  return { data: rows, meta: { total: rows.length, page, limit: 8, total_pages: totalPages } }
}

describe('adminOrdersService.listOrdersPage', () => {
  beforeEach(() => apiRequestMock.mockReset())

  it('requests /admin/orders with all query params', async () => {
    apiRequestMock.mockResolvedValue(orderPage([order]))

    const result = await adminOrdersService.listOrdersPage({
      page: 2,
      limit: 8,
      search: 'burger',
      status: 'pending',
      restaurantId: '64b0f1c2e4b0a1d2c3e4f702',
      from: '2026-11-01T00:00:00.000Z',
      to: '2026-11-26T23:59:59.999Z',
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/orders', {
      query: {
        page: 2,
        limit: 8,
        search: 'burger',
        status: 'pending',
        restaurantId: '64b0f1c2e4b0a1d2c3e4f702',
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-26T23:59:59.999Z',
      },
    })
    expect(result.data).toEqual([order])
    expect(result.meta.total_pages).toBe(1)
  })

  it('passes undefined filters through so the client omits them', async () => {
    apiRequestMock.mockResolvedValue(orderPage([]))

    await adminOrdersService.listOrdersPage({ page: 1, limit: 8 })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/orders', {
      query: {
        page: 1,
        limit: 8,
        search: undefined,
        status: undefined,
        restaurantId: undefined,
        from: undefined,
        to: undefined,
      },
    })
  })

  it('propagates contract errors', async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Forbidden'))
    await expect(adminOrdersService.listOrdersPage({ page: 1, limit: 8 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})

describe('adminOrdersService.cancelOrder', () => {
  beforeEach(() => apiRequestMock.mockReset())

  it('posts the required reason and returns the cancelled order', async () => {
    apiRequestMock.mockResolvedValue({ ...order, status: 'cancelled' })

    const result = await adminOrdersService.cancelOrder(order.id, '  Customer request  ')

    expect(apiRequestMock).toHaveBeenCalledWith(`/admin/orders/${order.id}/cancel`, {
      method: 'POST',
      body: { reason: 'Customer request' },
    })
    expect(result.status).toBe('cancelled')
  })

  it('propagates ORDER_NOT_CANCELLABLE and NOT_FOUND', async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError(409, 'ORDER_NOT_CANCELLABLE', 'Cannot cancel'))
    await expect(adminOrdersService.cancelOrder(order.id, 'why')).rejects.toMatchObject({
      code: 'ORDER_NOT_CANCELLABLE',
    })

    apiRequestMock.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'Order not found'))
    await expect(adminOrdersService.cancelOrder(order.id, 'why')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('adminOrdersService.listRestaurantOptions', () => {
  beforeEach(() => apiRequestMock.mockReset())

  it('pages through /admin/restaurants and maps id/name', async () => {
    apiRequestMock
      .mockResolvedValueOnce({
        data: [{ id: 'r1', name: 'Burger Hub' }],
        meta: { total: 2, page: 1, limit: 50, total_pages: 2 },
      })
      .mockResolvedValueOnce({
        data: [{ id: 'r2', name: 'Napoli Pizza' }],
        meta: { total: 2, page: 2, limit: 50, total_pages: 2 },
      })

    const result = await adminOrdersService.listRestaurantOptions()

    expect(apiRequestMock).toHaveBeenCalledTimes(2)
    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/admin/restaurants', {
      query: { page: 1, limit: 50 },
    })
    expect(result).toEqual([
      { id: 'r1', name: 'Burger Hub' },
      { id: 'r2', name: 'Napoli Pizza' },
    ])
  })
})
