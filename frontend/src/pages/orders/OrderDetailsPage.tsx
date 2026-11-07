
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Printer, RefreshCw, Share2, XCircle } from 'lucide-react'
import { Badge } from '@/shared/components/Badge'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Modal } from '@/shared/components/Modal'
import { Spinner } from '@/shared/components/Spinner'
import { useAuth } from '@/shared/hooks/useAuth'
import { useCart } from '@/shared/hooks/useCart'
import { useOrder } from '@/shared/hooks/useOrders'
import { orderService } from '@/shared/services/order.service'
import OrderTimeline from './OrderTimeline'
import { formatCurrency, formatDateTime, formatTime } from '@/shared/utils/format'
import MealReviewForm from './MealReviewForm'
import { useLanguage } from '@/shared/hooks/useLanguage'

const money = (value: number) => formatCurrency(value)

export default function OrderDetailsPage() {
  const { t } = useLanguage()
  const { id = '' } = useParams()
  const { user } = useAuth()
  const cart = useCart()
  const navigate = useNavigate()

  const { order, loading, error, retry } = useOrder(
    Number(id),
    user?.id ?? 0
  )

  const [cancelOpen, setCancelOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const currentStatus = order?.status

  useEffect(() => {
    if (
      !currentStatus ||
      currentStatus === 'delivered' ||
      currentStatus === 'cancelled'
    ) return

    const timer = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(timer)
  }, [currentStatus])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t("Loading order...")} />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title={t("Order not found")}
          description={
            error ? t(error) : t('This order may not exist or may belong to another account.')
          }
          action={<Button onClick={() => void retry()}>{t("Try again")}</Button>}
        />
      </div>
    )
  }

  const canCancel =
    order.status === 'pending' || order.status === 'preparing'

  const eta = order.estimatedDeliveryAt
    ? new Date(order.estimatedDeliveryAt).getTime()
    : null

  const remaining =
    eta === null ? 0 : Math.max(0, Math.ceil((eta - now) / 60000))

  const startedAt = new Date(order.createdAt).getTime()

  const progress =
    order.status === 'delivered'
      ? 100
      : order.status === 'cancelled'
        ? 0
        : eta !== null && eta > startedAt
          ? Math.min(
              95,
              Math.max(5, ((now - startedAt) / (eta - startedAt)) * 100)
            )
          : 5

  const reorder = async () => {
    try {
      const [response, restaurantsResponse] = await Promise.all([
        fetch('/mock/menu-items.json'),
        fetch('/mock/restaurants.json'),
      ])

      if (!response.ok || !restaurantsResponse.ok) {
        throw new Error(t('Could not verify current menu availability.'))
      }

      const [menuItems, restaurants] = await Promise.all([
        response.json() as Promise<Array<{
        id: number
        restaurantId: number
        isAvailable: boolean
      }>>,
        restaurantsResponse.json() as Promise<Array<{ id: number; name: string }>>,
      ])
      const restaurantName = restaurants.find(value => value.id === order.restaurantId)?.name
        ?? t('Restaurant #{id}', { id: order.restaurantId })

      const available = order.items.filter(item =>
        menuItems.some(
          meal =>
            meal.id === item.menuItemId &&
            meal.restaurantId === order.restaurantId &&
            meal.isAvailable
        )
      )

      if (!available.length) {
        setMessage(
          t('None of the meals in this order are currently available.')
        )
        return
      }

      available.forEach(item =>
        cart.addToCart({
          menuItemId: item.menuItemId,
          restaurantId: order.restaurantId,
          restaurantName,
          name: item.name,
          price: item.unitPrice,
          quantity: item.quantity
        })
      )

      if (available.length !== order.items.length) {
        setMessage(
          t('Some meals are no longer available and were skipped.')
        )
      }

      navigate('/checkout')
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? t(reason.message)
          : t('Unable to reorder this meal list.')
      )
    }
  }

  const cancel = async () => {
    setBusy(true)

    try {
      await orderService.cancelOrder(order.id, user?.id ?? 0)
      setCancelOpen(false)
      setMessage(t('Order cancelled.'))
      await retry()
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : t('Unable to cancel this order.')
      )
    } finally {
      setBusy(false)
    }
  }

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setMessage(t('Copied to clipboard.'))
    } catch {
      setMessage(value)
    }
  }

  const share = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ title: t('Order #{id}', { id: order.id }), url })
      } catch {
        /* dismissed */
      }
    } else {
      await copy(url)
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        to="/orders"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-brand-red"
      >
        <ArrowLeft size={16} />
        {t('All orders')}
      </Link>

      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-red">
            {t("Order tracking")}
          </p>
          <h1 className="mt-1 text-3xl font-bold">
            {t('Order #{id}', { id: order.id })}
          </h1>
          <p className="mt-2 text-sm text-text-slate">
            {t("Placed")} {formatDateTime(order.createdAt)}
          </p>
        </div>
        <Badge status={order.status} />
      </header>

      {message && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-brand-yellow/20 p-3 text-sm"
        >
          {message}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-5 text-lg font-semibold">
              {t("Delivery progress")}
            </h2>

            <div aria-live="polite">
              <OrderTimeline
                status={order.status}
                history={order.statusHistory}
              />
            </div>

            {eta !== null &&
              order.status !== 'delivered' &&
              order.status !== 'cancelled' && (
                <div className="mt-5 rounded-lg bg-brand-yellow/15 p-3">
                  <div className="flex justify-between gap-2 text-sm">
                    <span>{t("Estimated arrival")}</span>
                    <b>{formatTime(new Date(eta))}</b>
                  </div>

                  <p
                    className="mt-1 text-xs text-text-slate"
                    aria-live="polite"
                  >
                    {remaining > 0
                      ? t('About {minutes} min remaining', { minutes: remaining })
                      : t('Your order should arrive soon.')}
                  </p>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-border-subtle">
                    <div
                      className="h-full rounded-full bg-brand-red transition-[width] duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold">{t("Items")}</h2>
            <div className="space-y-4">
              {order.items.map(item => (
                <div
                  key={item.menuItemId}
                  className="flex justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{t(item.name)}</p>
                    <p className="text-xs text-text-slate">
                      {t("Quantity: {quantity}", { quantity: item.quantity })}
                    </p>
                  </div>
                  <span>
                    {money(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold">
              {t("Delivery & payment")}
            </h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-slate">{t("Address")}</dt>
                <dd className="font-medium">
                  {order.deliveryAddress}
                </dd>
              </div>
              <div>
                <dt className="text-text-slate">{t("Payment")}</dt>
                <dd className="font-medium capitalize">
                  {t(order.paymentMethod === 'cash' ? 'Cash on delivery' : 'Card')}
                  {order.paymentStatus === 'simulated' ? ' (demo)' : ''}
                </dd>
              </div>
              <div>
                <dt className="text-text-slate">{t("Phone")}</dt>
                <dd className="font-medium">{order.phone}</dd>
              </div>
              <div>
                <dt className="text-text-slate">{t("Notes")}</dt>
                <dd className="font-medium">
                  {order.notes || '—'}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <h2 className="mb-4 font-semibold">{t("Payment summary")}</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-slate">{t("Subtotal")}</span>
                <span>{money(order.subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-text-slate">{t("Delivery")}</span>
                <span>{money(order.deliveryFee)}</span>
              </div>

              {order.serviceFee !== undefined && (
                <div className="flex justify-between">
                  <span className="text-text-slate">{t("Service fee")}</span>
                  <span>{money(order.serviceFee)}</span>
                </div>
              )}

              {order.tax !== undefined && (
                <div className="flex justify-between">
                  <span className="text-text-slate">{t("Tax")}</span>
                  <span>{money(order.tax)}</span>
                </div>
              )}

              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span>{t("Discount")}</span>
                  <span>-{money(order.discount ?? 0)}</span>
                </div>
              )}

              {(order.tip ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span>{t("Tip")}</span>
                  <span>{money(order.tip ?? 0)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-border-subtle pt-3 text-lg font-bold">
                <span>{t("Total")}</span>
                <span>{money(order.total)}</span>
              </div>
            </div>
          </Card>

          {order.status === 'delivered' && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">
                {t("How was your meal?")}
              </h2>

              <div className="space-y-4">
                {order.items.map(item => (
                  <div key={item.menuItemId}>
                    <p className="mb-2 text-sm font-medium">
                      {item.name}
                    </p>
                    <MealReviewForm
                      order={order}
                      menuItemId={item.menuItemId}
                      customerName={user?.name ?? order.customerName}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Button className="w-full" onClick={() => void reorder()}>
            <RefreshCw size={16} />
            {t("Reorder these meals")}
          </Button>

          {canCancel && (
            <Button
              variant="danger"
              className="w-full"
              onClick={() => setCancelOpen(true)}
            >
              <XCircle size={16} />
              {t("Cancel order")}
            </Button>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void copy(String(order.id))}
            >
              <Copy size={14} />
              {t("Copy ID")}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => void share()}
            >
              <Share2 size={14} />
              {t("Share")}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer size={14} />
              {t("Print")}
            </Button>
          </div>
        </aside>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t("Cancel this order")}
      >
        <p className="text-sm text-text-slate">
          {t("Are you sure you want to cancel order #{id}?", { id: order.id })}
          {t("This action cannot be undone.")}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setCancelOpen(false)}
          >
            {t("Keep order")}
          </Button>

          <Button
            variant="danger"
            loading={busy}
            onClick={() => void cancel()}
          >
            {t("Confirm cancellation")}
          </Button>
        </div>
      </Modal>
    </section>
  )
}
