import { useCallback, useEffect, useRef, useState } from 'react'
import type { Order } from '@/shared/types'
import { orderService, type OrderListFilters, type PaginatedResponse } from '@/shared/services/order.service'

export function useOrders(customerId: string, page = 1, limit = 8, filters?: OrderListFilters) {
  const status = filters?.status ?? 'all'
  const search = filters?.search ?? ''
  const from = filters?.from ?? ''
  const to = filters?.to ?? ''
  const [result, setResult] = useState<PaginatedResponse<Order> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const next = await orderService.listOrders(customerId, page, limit, { status, search, from, to })
      if (mounted.current) setResult(next)
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'Unable to load orders.')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [customerId, page, limit, status, search, from, to])
  useEffect(() => { void load() }, [load])
  return { ...result, loading, error, retry: load }
}

const POLL_INTERVAL_MS = 15000
const FINAL_STATUSES: Order['status'][] = ['delivered', 'cancelled']

export function useOrder(orderId: string, customerId: string) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  const inFlight = useRef(false)
  const queued = useRef(false)
  const activeOrderId = useRef(orderId)
  const loadRef = useRef<() => Promise<void>>(async () => {})
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const load = useCallback(async () => {
    if (inFlight.current) { queued.current = true; return }
    inFlight.current = true
    try {
      const next = await orderService.getOrder(orderId)
      if (mounted.current && activeOrderId.current === orderId) { setError(null); setOrder(next) }
    } catch (reason) {
      if (mounted.current && activeOrderId.current === orderId) setError(reason instanceof Error ? reason.message : 'Unable to load this order.')
    } finally {
      inFlight.current = false
      if (mounted.current && queued.current) {
        queued.current = false
        void loadRef.current()
      }
      if (mounted.current && activeOrderId.current === orderId) setLoading(false)
    }
  }, [orderId])
  void customerId
  const status = order?.status
  useEffect(() => {
    loadRef.current = load
    activeOrderId.current = orderId
    setOrder(null); setLoading(true); setError(null)
  }, [orderId, load])
  useEffect(() => {
    void load()
    if (!status || FINAL_STATUSES.includes(status)) return
    const active = window.setInterval(() => { void load() }, POLL_INTERVAL_MS)
    return () => window.clearInterval(active)
  }, [load, status])
  return { order, loading, error, retry: load, refresh: load }
}
