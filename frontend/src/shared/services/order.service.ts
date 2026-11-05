import type { CartItem } from '@/shared/types/cart'
import type { Order, OrderStatus, PaymentMethod } from '@/shared/types'

const STORAGE_KEY = 'crown-anchor-orders'
const ADDRESS_KEY = 'crown-anchor-addresses'
const TERMINAL: OrderStatus[] = ['delivered', 'cancelled']
const FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'on_the_way', 'delivered']
const DURATIONS = [2, 8, 5, 12]

export interface OrderAddress { id: string; label: string; address: string; phone: string }
export interface CreateOrderInput {
  customerId: number; customerName: string; phone: string; restaurantId: number
  items: CartItem[]; deliveryAddress: string; paymentMethod: PaymentMethod; notes: string
  subtotal: number; deliveryFee: number; serviceFee: number; tax: number; discount: number
  tip: number; promoCode: string | null; scheduledFor: string | null; estimatedDeliveryAt: string
}
export interface PaginatedResponse<T> { data: T[]; meta: { total: number; page: number; limit: number; total_pages: number } }

function readOrders(): Order[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? JSON.parse(value) as Order[] : []
  } catch { return [] }
}
function writeOrders(orders: Order[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
}
function advanceOrder(order: Order): Order {
  if (TERMINAL.includes(order.status) || order.statusHistory.length === 0) return order
  const start = new Date(order.createdAt).getTime()
  const elapsed = Math.max(0, (Date.now() - start) / 60000)
  let total = 0
  let next: OrderStatus = 'pending'
  const history = [{ status: 'pending' as OrderStatus, at: order.createdAt }]
  for (let index = 0; index < DURATIONS.length; index += 1) {
    total += DURATIONS[index]
    if (elapsed >= total) {
      next = FLOW[index + 1]
      history.push({ status: next, at: new Date(start + total * 60000).toISOString() })
    } else break
  }
  if (next === order.status && history.length === order.statusHistory.length) return order
  return { ...order, status: next, statusHistory: history }
}
async function seedOrders(): Promise<Order[]> {
  const response = await fetch('/mock/orders.json')
  if (!response.ok) throw new Error('Could not load order history.')
  return await response.json() as Order[]
}
async function allOrders(): Promise<Order[]> {
  const stored = readOrders()
  if (stored.length) return stored.map(advanceOrder)
  const seed = await seedOrders()
  writeOrders(seed)
  return seed.map(advanceOrder)
}
export const orderService = {
  async listOrders(customerId: number, page = 1, limit = 6): Promise<PaginatedResponse<Order>> {
    const all = (await allOrders()).filter(order => order.customerId === customerId).sort((a,b) => b.createdAt.localeCompare(a.createdAt))
    writeOrders(all.length ? [...readOrders().filter(o => o.customerId !== customerId), ...all] : readOrders())
    const start = (page - 1) * limit
    return { data: all.slice(start, start + limit), meta: { total: all.length, page, limit, total_pages: Math.max(1, Math.ceil(all.length / limit)) } }
  },
  async getOrder(id: number, customerId: number): Promise<Order | null> {
    return (await allOrders()).find(order => order.id === id && order.customerId === customerId) ?? null
  },
  async createOrder(input: CreateOrderInput): Promise<Order> {
    const orders = await allOrders()
    const createdAt = new Date().toISOString()
    const order: Order = {
      id: Math.max(1000, ...orders.map(item => item.id)) + 1,
      customerId: input.customerId, customerName: input.customerName, phone: input.phone,
      restaurantId: input.restaurantId, status: 'pending',
      items: input.items.map(item => ({ menuItemId: item.menuItemId, name: item.name, quantity: item.quantity, unitPrice: item.price })),
      subtotal: input.subtotal, deliveryFee: input.deliveryFee, total: input.subtotal + input.deliveryFee + input.serviceFee + input.tax - input.discount + input.tip,
      deliveryAddress: input.deliveryAddress, paymentMethod: input.paymentMethod, notes: input.notes || null,
      createdAt, statusHistory: [{ status: 'pending', at: createdAt }], cancelledBy: null, cancellationReason: null,
      serviceFee: input.serviceFee, tax: input.tax, discount: input.discount, tip: input.tip,
      promoCode: input.promoCode, scheduledFor: input.scheduledFor, estimatedDeliveryAt: input.estimatedDeliveryAt,
      paymentStatus: input.paymentMethod === 'card' ? 'simulated' : 'pending',
    }
    writeOrders([order, ...orders])
    return order
  },
  async cancelOrder(id: number, customerId: number): Promise<Order> {
    const orders = await allOrders()
    const index = orders.findIndex(order => order.id === id && order.customerId === customerId)
    if (index < 0) throw new Error('Order not found.')
    const current = advanceOrder(orders[index])
    if (current.status !== 'pending' && current.status !== 'preparing') throw new Error('This order can no longer be cancelled.')
    const cancelled: Order = { ...current, status: 'cancelled', cancelledBy: 'customer', cancellationReason: 'Cancelled by customer', statusHistory: [...current.statusHistory, { status: 'cancelled', at: new Date().toISOString() }] }
    orders[index] = cancelled
    writeOrders(orders)
    return cancelled
  },
  async saveAddress(address: OrderAddress): Promise<void> {
    const values = this.getAddresses().filter(item => item.id !== address.id)
    localStorage.setItem(ADDRESS_KEY, JSON.stringify([...values, address]))
  },
  getAddresses(): OrderAddress[] {
    try { return JSON.parse(localStorage.getItem(ADDRESS_KEY) ?? '[]') as OrderAddress[] } catch { return [] }
  },
  async validatePromo(code: string, subtotal: number, deliveryFee: number): Promise<{ code: string; discount: number; deliveryFee: number } | null> {
    const normalized = code.trim().toUpperCase()
    if (normalized === 'WELCOME10') return { code: normalized, discount: Number((subtotal * 0.1).toFixed(2)), deliveryFee }
    if (normalized === 'FREESHIP') return { code: normalized, discount: 0, deliveryFee: 0 }
    return null
  },
}
