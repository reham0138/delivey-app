import { useCallback, useEffect, useState } from 'react'
import type { Order } from '@/shared/types'
import { orderService, type PaginatedResponse } from '@/shared/services/order.service'

export function useOrders(customerId: number, page = 1, limit = 6) {
  const [result, setResult] = useState<PaginatedResponse<Order> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setResult(await orderService.listOrders(customerId, page, limit)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load orders.') }
    finally { setLoading(false) }
  }, [customerId, page, limit])
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
  useEffect(() => {
    void load()
    const active = window.setInterval(() => { void load() }, 15000)
    return () => window.clearInterval(active)
  }, [load])
  return { order, loading, error, retry: load, refresh: load }
}
