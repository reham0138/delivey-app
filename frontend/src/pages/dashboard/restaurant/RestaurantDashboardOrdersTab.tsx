import { useState, type FormEvent } from 'react'
import { StatusPill } from '@/pages/dashboard/components/StatusPill'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Modal } from '@/shared/components/Modal'
import { useLanguage } from '@/shared/hooks/useLanguage'
import type { MenuItem, Order, OrderStatus } from '@/shared/types'
import { formatCurrency, formatDateTime } from '@/shared/utils/format'

const ORDER_NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'on_the_way',
  on_the_way: 'delivered',
}

function OrderCard({
  order,
  meals,
  busy,
  onAdvance,
  onCancel,
}: {
  order: Order
  meals: Map<string, MenuItem>
  busy: boolean
  onAdvance: (status: OrderStatus) => void
  onCancel: () => void
}) {
  const { t } = useLanguage()
  const nextStatus = ORDER_NEXT_STATUS[order.status]
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text-main">#{order.id} · {order.customerName}</h3>
          <p className="text-sm text-text-slate">{formatDateTime(order.createdAt)} · {t(order.paymentMethod)}</p>
          <p className="text-sm text-text-slate">{t(order.deliveryAddress)} · {order.phone}</p>
        </div>
        <StatusPill tone={order.status === 'delivered' ? 'good' : order.status === 'cancelled' ? 'bad' : 'neutral'}>
          {t(order.status)}
        </StatusPill>
      </div>
      <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
        {order.items.map((item, index) => {
          const meal = meals.get(item.menuItemId)
          return (
            <li key={`${item.menuItemId}-${index}`} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="font-medium text-text-main">{item.quantity}× {t(item.name)}</span>
              <span className="text-text-slate">
                {meal ? `${t(meal.category)} · ${meal.preparationTimeMinutes} ${t('min')}` : t('Meal details unavailable')}
              </span>
              <span className="font-medium text-text-main">{formatCurrency(item.unitPrice * item.quantity)}</span>
            </li>
          )
        })}
      </ul>
      {order.notes && <p className="text-sm text-text-slate"><span className="font-semibold">{t('Customer notes')}:</span> {order.notes}</p>}
      {order.status === 'cancelled' && order.cancellationReason && (
        <p className="text-sm text-text-slate">
          <span className="font-semibold">{t('Cancellation reason')}:</span> {order.cancellationReason}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <p className="font-semibold text-text-main">{t('Order total')}: {formatCurrency(order.total)}</p>
        <div className="flex flex-wrap justify-end gap-2">
          {(order.status === 'pending' || order.status === 'preparing') && (
            <Button variant="outline" disabled={busy} onClick={onCancel}>
              {t('Cancel order')}
            </Button>
          )}
          {nextStatus && (
            <Button loading={busy} onClick={() => onAdvance(nextStatus)}>
              {t(order.status === 'pending' ? 'Accept order' : `Mark ${nextStatus.replaceAll('_', ' ')}`)}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export function RestaurantDashboardOrdersTab({
  orders,
  mealById,
  busy,
  onUpdateOrder,
  onCancelOrder,
}: {
  orders: Order[]
  mealById: Map<string, MenuItem>
  busy: boolean
  onUpdateOrder: (orderId: string, status: OrderStatus) => void
  onCancelOrder: (orderId: string, reason: string) => Promise<boolean>
}) {
  const { t } = useLanguage()
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null)
  const [reason, setReason] = useState('')

  const submitCancellation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!orderToCancel || !reason.trim()) return
    if (await onCancelOrder(orderToCancel.id, reason.trim())) {
      setOrderToCancel(null)
      setReason('')
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-text-main">{t('Restaurant orders')}</h2>
          <p className="text-sm text-text-slate">{t('Accept each order, then move it through preparation and delivery.')}</p>
        </div>
        {orders.length === 0 ? (
          <EmptyState title={t('No orders yet')} description={t('New customer orders will appear here.')} />
        ) : orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            meals={mealById}
            busy={busy}
            onAdvance={(status) => onUpdateOrder(order.id, status)}
            onCancel={() => {
              setOrderToCancel(order)
              setReason('')
            }}
          />
        ))}
      </div>
      <Modal
        open={orderToCancel !== null}
        onClose={() => {
          setOrderToCancel(null)
          setReason('')
        }}
        title={t('Cancel order')}
      >
        <form className="space-y-4" onSubmit={(event) => void submitCancellation(event)}>
          <label className="grid gap-2 text-sm font-semibold text-text-main">
            {t('Cancellation reason')}
            <textarea
              className="min-h-24 rounded-lg border border-border-subtle bg-surface-white px-3 py-2 font-normal text-text-main"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => setOrderToCancel(null)}>
              {t('Keep order')}
            </Button>
            <Button type="submit" variant="danger" loading={busy} disabled={!reason.trim()}>
              {t('Confirm cancellation')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
