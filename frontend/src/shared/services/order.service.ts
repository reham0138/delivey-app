import { apiRequest } from '@/shared/api/client'
import { normalizeMockIds } from '@/shared/utils/normalizeMockIds'
import type { Order, OrderStatus, PaginatedResponse, PaymentMethod } from '@/shared/types'

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

  // TODO remove when the dashboard tabs are connected
  // Mock-only: still used by dashboard.service, restaurantDashboard.service and admin.service.
  async listAllOrders(): Promise<Order[]> {
    return (await loadMockOrders()).sort((first, second) => second.createdAt.localeCompare(first.createdAt))
  },

  // TODO remove when the dashboard tabs are connected
  // Mock-only: still used by admin.service for the admin orders page.
  async deleteOrder(id: string): Promise<void> {
    const orders = await loadMockOrders()
    const remaining = orders.filter(order => order.id !== id)
    if (remaining.length === orders.length) throw new Error('Order not found.')
    writeMockOrders(remaining)
  },
}

// TODO remove when the dashboard tabs are connected
// Mock-only adapter kept for dashboard.service, restaurantDashboard.service
// and admin.service, which still render mock order data.
const MOCK_ORDERS_KEY = 'crown-anchor-orders'
const TERMINAL: OrderStatus[] = ['delivered', 'cancelled']
const FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'on_the_way', 'delivered']

function readMockOrders(): Order[] {
  try {
    const value = localStorage.getItem(MOCK_ORDERS_KEY)
    return value ? (JSON.parse(value) as Order[]) : []
  } catch { return [] }
}
function writeMockOrders(orders: Order[]) {
  localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(orders))
}
function advanceMockOrder(order: Order): Order {
  if (!order.simulatedTracking || TERMINAL.includes(order.status) || !Array.isArray(order.statusHistory) || order.statusHistory.length === 0) return order
  const start = new Date(order.createdAt).getTime()
  const elapsed = Math.max(0, (Date.now() - start) / 60000)
  const totalMinutes = Math.max(10, (new Date(order.estimatedDeliveryAt ?? order.createdAt).getTime() - start) / 60000)
  const durations = [0.1, 0.4, 0.2, 0.3].map(weight => totalMinutes * weight)
  let total = 0
  let next: OrderStatus = 'pending'
  const history = [{ status: 'pending' as OrderStatus, at: order.createdAt }]
  for (let index = 0; index < durations.length; index += 1) {
    total += durations[index]
    if (elapsed >= total) {
      next = FLOW[index + 1]
      history.push({ status: next, at: new Date(start + total * 60000).toISOString() })
    } else break
  }
  if (next === order.status && history.length === order.statusHistory.length) return order
  return { ...order, status: next, statusHistory: history }
}
async function seedMockOrders(): Promise<Order[]> {
  const response = await fetch('/mock/orders.json')
  if (!response.ok) throw new Error('Could not load order history.')
  return normalizeMockIds(await response.json() as Order[])
}
async function loadMockOrders(): Promise<Order[]> {
  const stored = readMockOrders()
  if (stored.length) return stored.map(advanceMockOrder)
  const seed = await seedMockOrders()
  writeMockOrders(seed)
  return seed.map(advanceMockOrder)
}

