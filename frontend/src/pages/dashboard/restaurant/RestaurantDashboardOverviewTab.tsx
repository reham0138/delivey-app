import type { ReactNode } from 'react'
import { ClipboardList, MessageSquare, Utensils } from 'lucide-react'

import { StatusPill } from '@/pages/dashboard/components/StatusPill'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { Rating } from '@/shared/components/Rating'
import { useLanguage } from '@/shared/hooks/useLanguage'
import type { RestaurantDashboardData, DashboardTabId } from './RestaurantDashboardTabs'

function SummaryCard({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <Card className="flex items-center gap-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
        {icon}
      </span>
      <div>
        <p className="text-sm text-text-slate">{label}</p>
        <p className="text-2xl font-bold text-text-main">{value}</p>
      </div>
    </Card>
  )
}

export function RestaurantDashboardOverviewTab({
  data,
  onSelectTab,
}: {
  data: RestaurantDashboardData
  onSelectTab: (tab: DashboardTabId) => void
}) {
  const { t } = useLanguage()
  const restaurant = data.restaurant
  if (!restaurant) return null

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label={t('Meals')} value={data.meals.length} icon={<Utensils aria-hidden="true" size={21} />} />
        <SummaryCard label={t('Active orders')} value={data.orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length} icon={<ClipboardList aria-hidden="true" size={21} />} />
        <SummaryCard label={t('Reviews')} value={data.reviews.length} icon={<MessageSquare aria-hidden="true" size={21} />} />
        <SummaryCard label={t('Average rating')} value={restaurant.rating.toFixed(1)} icon={<span aria-hidden="true">★</span>} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text-main">{t('Recent orders')}</h2>
            <Button size="sm" variant="ghost" onClick={() => onSelectTab('orders')}>{t('View all')}</Button>
          </div>
          {data.orders.length ? data.orders.slice(0, 3).map((order) => (
            <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3">
              <div>
                <p className="font-semibold text-text-main">#{order.id} · {order.customerName}</p>
                <p className="text-xs text-text-slate">{order.items.map((item) => `${item.quantity}× ${t(item.name)}`).join(', ')}</p>
              </div>
              <StatusPill tone={order.status === 'delivered' ? 'good' : 'neutral'}>{t(order.status)}</StatusPill>
            </div>
          )) : <p className="text-sm text-text-slate">{t('No orders yet')}</p>}
        </Card>
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text-main">{t('Recent reviews')}</h2>
            <Button size="sm" variant="ghost" onClick={() => onSelectTab('reviews')}>{t('View all')}</Button>
          </div>
          {data.reviews.length ? data.reviews.slice(0, 3).map((review) => (
            <div key={review.id} className="border-t border-border-subtle pt-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-text-main">{review.customerName}</p>
                <Rating value={review.rating} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-text-slate">{review.comment || t('No written comment')}</p>
            </div>
          )) : <p className="text-sm text-text-slate">{t('No reviews yet')}</p>}
        </Card>
      </div>
    </>
  )
}
