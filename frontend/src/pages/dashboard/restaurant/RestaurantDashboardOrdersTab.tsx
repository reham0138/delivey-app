import { StatusPill } from '@/pages/dashboard/components/StatusPill'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
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
}: {
  order: Order
  meals: Map<string, MenuItem>
  busy: boolean
  onAdvance: (status: OrderStatus) => void
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <p className="font-semibold text-text-main">{t('Order total')}: {formatCurrency(order.total)}</p>
        {nextStatus && (
          <Button loading={busy} onClick={() => onAdvance(nextStatus)}>
            {t(order.status === 'pending' ? 'Accept order' : `Mark ${nextStatus.replaceAll('_', ' ')}`)}
          </Button>
        )}
      </div>
    </Card>
  )
}

export function RestaurantDashboardOrdersTab({
  orders,
  mealById,
  busy,
  onUpdateOrder,
}: {
  orders: Order[]
  mealById: Map<string, MenuItem>
  busy: boolean
  onUpdateOrder: (orderId: string, status: OrderStatus) => void
}) {
  const { t } = useLanguage()

  return (
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
        />
      ))}
    </div>
  )
}
