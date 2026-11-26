import { apiRequest } from '@/shared/api/client'
import type { Order, PaginatedResponse, PaymentMethod } from '@/shared/types'

export type { PaginatedResponse } from '@/shared/types'

export interface OrderAddress { id: string; label: string; address: string; phone: string }
export interface CreateOrderItemInput { menuItemId: string; quantity: number }
export interface CreateOrderInput {
  restaurantId: string
  items: CreateOrderItemInput[]
  deliveryAddress: string
  phone: string
  paymentMethod: PaymentMethod
  notes?: string
  promoCode?: string | null
  tip?: number
  scheduledFor?: string | null
}
export interface OrderListFilters { status?: string; search?: string; from?: string; to?: string }
export interface OrderTotals {
  subtotal: number; deliveryFee: number; serviceFee: number; tax: number; discount: number; tip: number; total: number
}

function buildOrderBody(input: CreateOrderInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    restaurantId: input.restaurantId,
    items: input.items.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity })),
    deliveryAddress: input.deliveryAddress,
    phone: input.phone,
    paymentMethod: input.paymentMethod,
  }
  const notes = input.notes?.trim()
  if (notes) body.notes = notes
  const promoCode = input.promoCode?.trim().toUpperCase()
  if (promoCode) body.promoCode = promoCode
  if (input.tip && input.tip > 0) body.tip = input.tip
  if (input.scheduledFor) body.scheduledFor = input.scheduledFor
  return body
}

export const orderService = {
  async listOrders(
    customerId: string,
    page = 1,
    limit = 8,
    filters?: OrderListFilters,
  ): Promise<PaginatedResponse<Order>> {
    void customerId // the backend scopes orders to the authenticated customer
    return apiRequest<PaginatedResponse<Order>>('/orders', {
      query: {
        status: filters?.status && filters.status !== 'all' ? filters.status : undefined,
        search: filters?.search?.trim() || undefined,
        from: filters?.from ? `${filters.from}T00:00:00.000Z` : undefined,
        to: filters?.to ? `${filters.to}T23:59:59.999Z` : undefined,
        page,
        limit: Math.min(limit, 50),
      },
    })
  },

  async getOrder(id: string): Promise<Order> {
    return apiRequest<Order>(`/orders/${encodeURIComponent(id)}`)
  },

  async createOrder(input: CreateOrderInput): Promise<Order> {
    return apiRequest<Order>('/orders', { method: 'POST', body: buildOrderBody(input) })
  },

  async quoteOrder(input: CreateOrderInput): Promise<OrderTotals> {
    return apiRequest<OrderTotals>('/orders/quote', { method: 'POST', body: buildOrderBody(input) })
  },

  async cancelOrder(id: string, customerId: string, reason?: string): Promise<Order> {
    void customerId // the backend scopes orders to the authenticated customer
    return apiRequest<Order>(`/orders/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: reason?.trim() ? { reason: reason.trim() } : {},
    })
  },

  async listAddresses(): Promise<OrderAddress[]> {
    const result = await apiRequest<{ data: OrderAddress[] }>('/users/me/addresses')
    return result.data
  },

  async saveAddress(address: OrderAddress): Promise<OrderAddress> {
    return apiRequest<OrderAddress>('/users/me/addresses', {
      method: 'POST',
      body: { label: address.label, address: address.address, phone: address.phone },
    })
  },

  async updateAddress(id: string, address: OrderAddress): Promise<OrderAddress> {
    return apiRequest<OrderAddress>(`/users/me/addresses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { label: address.label, address: address.address, phone: address.phone },
    })
  },

  async deleteAddress(id: string): Promise<void> {
    await apiRequest<void>(`/users/me/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}

