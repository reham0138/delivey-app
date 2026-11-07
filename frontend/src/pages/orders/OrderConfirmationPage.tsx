import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, MapPin, Package, Truck } from 'lucide-react'
import { Badge } from '@/shared/components/Badge'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Spinner } from '@/shared/components/Spinner'
import { useAuth } from '@/shared/hooks/useAuth'
import { useOrder } from '@/shared/hooks/useOrders'
import { useLanguage } from '@/shared/hooks/useLanguage'
import { formatCurrency, formatTime } from '@/shared/utils/format'

const money = (value: number) => formatCurrency(value)

export default function OrderConfirmationPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { t } = useLanguage()
  const relatedIds = (searchParams.get('related') ?? '').split(',').filter(Boolean)
  const { user } = useAuth()
  const { order, loading, error, retry } = useOrder(Number(id), user?.id ?? 0)

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner label={t('Loading confirmation...')} /></div>
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title={t('Confirmation unavailable')}
          description={error ?? t('We could not find this order.')}
          action={<Button onClick={() => void retry()}>{t('Try again')}</Button>}
        />
      </div>
    )
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <Card className="text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100 text-green-700">
          <CheckCircle2 size={34} />
        </span>
        <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-brand-red">
          {t('Order confirmed')}
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {t('Thanks, {name}!', { name: order.customerName.split(' ')[0] })}
        </h1>
        <p className="mt-2 text-text-slate">
          {t('Your order has been received and the restaurant is getting ready.')}
        </p>
        <div className="my-6 flex flex-wrap items-center justify-center gap-3">
          <Badge status={order.status} />
          <span className="text-sm text-text-slate">{t('Order #{id}', { id: order.id })}</span>
        </div>
        <div className="space-y-3 rounded-xl bg-surface-cream p-4 text-start">
          <div className="flex justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-text-slate">
              <Package size={16} /> {t('item types', { count: order.items.length })}
            </span>
            <b>{money(order.total)}</b>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={16} className="mt-0.5 shrink-0 text-brand-red" />
            <span>{order.deliveryAddress}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-slate">{t('Payment')}</span>
            <span className="font-medium capitalize">{t(order.paymentMethod === 'cash' ? 'Cash on delivery' : 'Card')}{order.paymentStatus === 'simulated' ? ' · demo' : ''}</span>
          </div>
          {order.estimatedDeliveryAt && (
            <div className="flex justify-between text-sm">
              <span className="text-text-slate">{t('Estimated delivery')}</span>
              <span className="font-medium">{formatTime(order.estimatedDeliveryAt)}</span>
            </div>
          )}
        </div>
        {relatedIds.length > 0 && (
          <div className="mt-5 rounded-xl border border-border-subtle p-4 text-start">
            <p className="text-sm font-semibold">{t('Separate orders created for other restaurants')}</p>
            <ul className="mt-2 space-y-2">
              {relatedIds.map((relatedId) => (
                <li key={relatedId}>
                  <Link className="text-sm font-semibold text-brand-red underline" to={`/orders/${relatedId}`}>
                    {t('Track order #{id}', { id: relatedId })}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link to={`/orders/${order.id}`} className="mt-6 block">
          <Button className="w-full"><Truck size={17} /> {t('Track your order')}</Button>
        </Link>
        <Link to="/orders" className="mt-4 inline-block text-sm font-semibold text-brand-red underline">
          {t('View all orders')}
        </Link>
      </Card>
    </section>
  )
}
