import { useCallback, useEffect, useState } from 'react'
import type { Order } from '@/shared/types'
import { orderService, type PaginatedResponse } from '@/shared/services/order.service'

export function useOrders(customerId: number, page = 1, limit = 6, filters?: { status?: string; search?: string; from?: string; to?: string }) {
  const status = filters?.status ?? 'all'
  const search = filters?.search ?? ''
  const from = filters?.from ?? ''
  const to = filters?.to ?? ''
  const [result, setResult] = useState<PaginatedResponse<Order> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setResult(await orderService.listOrders(customerId, page, limit, { status, search, from, to })) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load orders.') }
    finally { setLoading(false) }
  }, [customerId, page, limit, status, search, from, to])
  useEffect(() => { void load() }, [load])
  return { ...result, loading, error, retry: load }
}
export function useOrder(orderId: number, customerId: number) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { setError(null); setOrder(await orderService.getOrder(orderId, customerId)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load this order.') }
    finally { setLoading(false) }
  }, [orderId, customerId])
  const status = order?.status
  useEffect(() => {
    void load()
    if (status === 'delivered' || status === 'cancelled') return
    const active = window.setInterval(() => { void load() }, 15000)
    return () => window.clearInterval(active)
  }, [load, status])
  return { order, loading, error, retry: load, refresh: load }
}
