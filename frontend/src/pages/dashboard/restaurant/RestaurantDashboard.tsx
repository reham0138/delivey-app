import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { ClipboardList, MessageSquare, Pencil, Plus, Trash2, Utensils } from 'lucide-react'
import { ConfirmDialog } from '@/pages/dashboard/components/ConfirmDialog'
import { StatusPill } from '@/pages/dashboard/components/StatusPill'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Input } from '@/shared/components/Input'
import { Modal } from '@/shared/components/Modal'
import { Rating } from '@/shared/components/Rating'
import { Spinner } from '@/shared/components/Spinner'
import { useAuth } from '@/shared/hooks/useAuth'
import { useLanguage } from '@/shared/hooks/useLanguage'
import { restaurantDashboardService } from '@/shared/services/restaurantDashboard.service'
import type { MealChanges } from '@/shared/services/restaurantDashboard.service'
import type { MenuItem, Order, OrderStatus, Restaurant, Review } from '@/shared/types'
import { formatCurrency } from '@/shared/utils/format'
import { formatDateTime } from '@/shared/utils/format'

type DashboardTab = 'overview' | 'meals' | 'orders' | 'reviews'
type DashboardData = {
  restaurant: Restaurant | null
  meals: MenuItem[]
  orders: Order[]
  reviews: Review[]
}

const EMPTY_DATA: DashboardData = { restaurant: null, meals: [], orders: [], reviews: [] }
const MAX_IMAGE_BYTES = 1024 * 1024
const ORDER_NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'on_the_way',
  on_the_way: 'delivered',
}

function readImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('Choose an image file.'))
  if (file.size > MAX_IMAGE_BYTES) return Promise.reject(new Error('Choose an image smaller than 1 MB.'))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('The image could not be read.'))
    }
    reader.onerror = () => reject(new Error('The image could not be read.'))
    reader.readAsDataURL(file)
  })
}

interface MealFormValues {
  name: string
  description: string
  price: string
  category: string
  preparationTimeMinutes: string
  ingredients: string
  image: string | null
  isAvailable: boolean
  isPopular: boolean
}

function mealFormValues(meal?: MenuItem): MealFormValues {
  return {
    name: meal?.name ?? '',
    description: meal?.description ?? '',
    price: meal ? String(meal.price) : '',
    category: meal?.category ?? '',
    preparationTimeMinutes: meal ? String(meal.preparationTimeMinutes) : '',
    ingredients: meal?.ingredients.join(', ') ?? '',
    image: meal?.image ?? null,
    isAvailable: meal?.isAvailable ?? true,
    isPopular: meal?.isPopular ?? false,
  }
}

function getMealChanges(values: MealFormValues): MealChanges {
  const price = Number(values.price)
  const preparationTimeMinutes = Number(values.preparationTimeMinutes)
  if (!values.name.trim() || !values.description.trim() || !values.category.trim()) {
    throw new Error('Complete the meal name, description and category.')
  }
  if (!Number.isFinite(price) || price <= 0) throw new Error('Enter a price greater than zero.')
  if (!Number.isInteger(preparationTimeMinutes) || preparationTimeMinutes < 1) {
    throw new Error('Enter a preparation time of at least one minute.')
  }
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    price,
    category: values.category.trim(),
    preparationTimeMinutes,
    ingredients: values.ingredients.split(',').map((item) => item.trim()).filter(Boolean),
    image: values.image,
    isAvailable: values.isAvailable,
    isPopular: values.isPopular,
  }
}

function MealEditor({
  meal,
  busy,
  onClose,
  onSave,
}: {
  meal: MenuItem | null
  busy: boolean
  onClose: () => void
  onSave: (changes: MealChanges) => Promise<void>
}) {
  const { t } = useLanguage()
  const [values, setValues] = useState(() => mealFormValues(meal ?? undefined))
  const [imageError, setImageError] = useState('')
  const [formError, setFormError] = useState('')

  const setField = <K extends keyof MealFormValues>(key: K, value: MealFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const selectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImageError('')
    try {
      setField('image', await readImage(file))
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'The image could not be read.')
      event.target.value = ''
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    try {
      await onSave(getMealChanges(values))
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'The meal could not be saved.')
    }
  }

  return (
    <Modal open onClose={onClose} title={t(meal ? 'Edit meal' : 'Add meal')} size="lg">
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('Meal name')}
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
            required
            maxLength={100}
          />
          <Input
            label={t('Category')}
            value={values.category}
            onChange={(event) => setField('category', event.target.value)}
            required
            maxLength={60}
          />
          <Input
            label={t('Price')}
            type="number"
            min="0.01"
            step="0.01"
            value={values.price}
            onChange={(event) => setField('price', event.target.value)}
            required
          />
          <Input
            label={t('Preparation time (minutes)')}
            type="number"
            min="1"
            step="1"
            value={values.preparationTimeMinutes}
            onChange={(event) => setField('preparationTimeMinutes', event.target.value)}
            required
          />
        </div>
        <label className="grid gap-2 text-sm font-semibold text-text-main">
          {t('Description')}
          <textarea
            className="min-h-24 rounded-lg border border-border-subtle bg-surface-white px-3 py-2 font-normal text-text-main"
            value={values.description}
            onChange={(event) => setField('description', event.target.value)}
            required
            maxLength={500}
          />
        </label>
        <Input
          label={t('Ingredients')}
          hint={t('Separate ingredients with commas.')}
          value={values.ingredients}
          onChange={(event) => setField('ingredients', event.target.value)}
          maxLength={500}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input
            label={t('Meal image')}
            hint={t('Image file up to 1 MB.')}
            type="file"
            accept="image/*"
            onChange={(event) => void selectImage(event)}
            error={imageError}
          />
          {values.image && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setField('image', null)}
              className="sm:mb-1"
            >
              {t('Remove image')}
            </Button>
          )}
        </div>
        {values.image && (
          <img
            src={values.image}
            alt={t('Meal image preview')}
            className="h-40 w-full rounded-lg border border-border-subtle object-cover sm:w-64"
          />
        )}
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-text-main">
            <input
              type="checkbox"
              checked={values.isAvailable}
              onChange={(event) => setField('isAvailable', event.target.checked)}
            />
            {t('Available for ordering')}
          </label>
          <label className="flex items-center gap-2 text-sm text-text-main">
            <input
              type="checkbox"
              checked={values.isPopular}
              onChange={(event) => setField('isPopular', event.target.checked)}
            />
            {t('Mark as popular')}
          </label>
        </div>
        {formError && <p role="alert" className="text-sm text-danger">{t(formError)}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={busy} onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" loading={busy}>{t(meal ? 'Save changes' : 'Add meal')}</Button>
        </div>
      </form>
    </Modal>
  )
}

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

export default function RestaurantDashboard() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [actionError, setActionError] = useState('')
  const [tab, setTab] = useState<DashboardTab>('overview')
  const [mealEditor, setMealEditor] = useState<MenuItem | null | undefined>(undefined)
  const [mealToDelete, setMealToDelete] = useState<MenuItem | null>(null)
  const [reviewToReport, setReviewToReport] = useState<Review | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setPageError('')
    try {
      setData(await restaurantDashboardService.load(user.id))
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load restaurant dashboard.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const mealById = useMemo(() => new Map(data.meals.map((meal) => [meal.id, meal])), [data.meals])

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true)
    setActionError('')
    try {
      await action()
      await load()
      return true
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The action could not be completed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const saveMeal = async (changes: MealChanges) => {
    if (!user) return
    const saved = await runAction(() =>
      mealEditor
        ? restaurantDashboardService.updateMeal(user.id, mealEditor.id, changes)
        : restaurantDashboardService.createMeal(user.id, changes).then(() => undefined),
    )
    if (saved) setMealEditor(undefined)
  }

  const deleteMeal = async () => {
    if (!user || !mealToDelete) return
    if (await runAction(() => restaurantDashboardService.deleteMeal(user.id, mealToDelete.id))) {
      setMealToDelete(null)
    }
  }

  const reportReview = async () => {
    if (!user || !reviewToReport) return
    if (await runAction(() => restaurantDashboardService.reportReview(user.id, reviewToReport.id, reportReason))) {
      setReviewToReport(null)
      setReportReason('')
    }
  }

  const updateOrder = (orderId: number, status: OrderStatus) => {
    if (!user) return
    void runAction(() => restaurantDashboardService.updateOrderStatus(user.id, orderId, status))
  }

  if (loading) return <Spinner label={t('Loading restaurant dashboard...')} />
  if (pageError) {
    return (
      <EmptyState
        title={t('Unable to load restaurant dashboard')}
        description={t(pageError)}
        action={<Button onClick={() => void load()}>{t('Try again')}</Button>}
      />
    )
  }
  if (!data.restaurant) {
    return (
      <EmptyState
        title={t('No restaurant linked to this account')}
        description={t('Ask an administrator to connect your account to a restaurant.')}
      />
    )
  }
  const restaurant = data.restaurant

  const tabs: { id: DashboardTab; label: string; icon: ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Utensils aria-hidden="true" size={17} /> },
    { id: 'meals', label: 'Meals', icon: <Utensils aria-hidden="true" size={17} /> },
    { id: 'orders', label: 'Orders', icon: <ClipboardList aria-hidden="true" size={17} /> },
    { id: 'reviews', label: 'Reviews', icon: <MessageSquare aria-hidden="true" size={17} /> },
  ]

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-red">{t('Restaurant dashboard')}</p>
          <h1 className="mt-1 text-2xl font-bold text-text-main sm:text-3xl">{t(restaurant.name)}</h1>
          <p className="mt-1 text-sm text-text-slate">{t(restaurant.cuisine)} · {t(restaurant.address)}</p>
        </div>
        <Button variant="outline" onClick={() => void load()}>{t('Refresh')}</Button>
      </header>

      <div role="tablist" aria-label={t('Restaurant dashboard sections')} className="flex gap-2 overflow-x-auto border-b border-border-subtle">
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`restaurant-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="restaurant-tab-panel"
            onClick={() => setTab(id)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold ${
              tab === id ? 'border-brand-red text-brand-red' : 'border-transparent text-text-slate hover:text-text-main'
            }`}
          >
            {icon}
            {t(label)}
          </button>
        ))}
      </div>

      {actionError && (
        <div role="alert" className="flex items-start justify-between gap-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          <span>{t(actionError)}</span>
          <button type="button" className="font-semibold underline" onClick={() => setActionError('')}>{t('Dismiss')}</button>
        </div>
      )}

      <div
        id="restaurant-tab-panel"
        role="tabpanel"
        aria-labelledby={`restaurant-tab-${tab}`}
        className="space-y-5"
      >
        {tab === 'overview' && (
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
                  <Button size="sm" variant="ghost" onClick={() => setTab('orders')}>{t('View all')}</Button>
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
                  <Button size="sm" variant="ghost" onClick={() => setTab('reviews')}>{t('View all')}</Button>
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
        )}

        {tab === 'meals' && (
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-text-main">{t('Manage meals')}</h2>
                <p className="text-sm text-text-slate">{t('Add and update menu details, availability and images.')}</p>
              </div>
              <Button onClick={() => setMealEditor(null)}><Plus aria-hidden="true" size={17} />{t('Add meal')}</Button>
            </div>
            {data.meals.length === 0 ? (
              <EmptyState title={t('No meals yet')} description={t('Add your first meal to start building your menu.')} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.meals.map((meal) => (
                  <article key={meal.id} className="overflow-hidden rounded-lg border border-border-subtle">
                    {meal.image ? (
                      <img src={meal.image} alt={t(meal.name)} className="h-44 w-full bg-surface-cream object-cover" />
                    ) : (
                      <div className="flex h-44 items-center justify-center bg-surface-cream text-text-slate">
                        <Utensils aria-hidden="true" size={32} />
                        <span className="sr-only">{t('No meal image')}</span>
                      </div>
                    )}
                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-text-main">{t(meal.name)}</h3>
                          <p className="text-sm text-text-slate">{t(meal.category)} · {meal.preparationTimeMinutes} {t('min')}</p>
                        </div>
                        <StatusPill tone={meal.isAvailable ? 'good' : 'bad'}>{t(meal.isAvailable ? 'Available' : 'Unavailable')}</StatusPill>
                      </div>
                      <p className="line-clamp-2 min-h-10 text-sm text-text-slate">{t(meal.description)}</p>
                      <div className="flex items-center justify-between border-t border-border-subtle pt-3">
                        <span className="font-semibold text-text-main">{formatCurrency(meal.price)}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" aria-label={t('Edit {name}', { name: meal.name })} onClick={() => setMealEditor(meal)}>
                            <Pencil aria-hidden="true" size={15} />{t('Edit')}
                          </Button>
                          <Button size="sm" variant="danger" aria-label={t('Delete {name}', { name: meal.name })} onClick={() => setMealToDelete(meal)}>
                            <Trash2 aria-hidden="true" size={15} />{t('Delete')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>
        )}

        {tab === 'orders' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-text-main">{t('Restaurant orders')}</h2>
              <p className="text-sm text-text-slate">{t('Accept each order, then move it through preparation and delivery.')}</p>
            </div>
            {data.orders.length === 0 ? (
              <EmptyState title={t('No orders yet')} description={t('New customer orders will appear here.')} />
            ) : data.orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                meals={mealById}
                busy={busy}
                onAdvance={(status) => updateOrder(order.id, status)}
              />
            ))}
          </div>
        )}

        {tab === 'reviews' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-text-main">{t('Meal and restaurant reviews')}</h2>
              <p className="text-sm text-text-slate">{t('Review comments from customers. Report offensive content for administrator review.')}</p>
            </div>
            {data.reviews.length === 0 ? (
              <EmptyState title={t('No reviews yet')} description={t('Customer reviews will appear here.')} />
            ) : data.reviews.map((review) => {
              const meal = mealById.get(review.menuItemId)
              return (
                <Card key={review.id} className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-main">{review.customerName}</p>
                      <p className="text-sm text-text-slate">{meal ? t(meal.name) : t(restaurant.name)} · {formatDateTime(review.createdAt)}</p>
                    </div>
                    <Rating value={review.rating} />
                  </div>
                  <p className="whitespace-pre-line text-sm leading-6 text-text-main">{review.comment || t('No written comment')}</p>
                  {review.isReported ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone="neutral">{t('Reported to admin')}</StatusPill>
                      {review.reportReason && <span className="text-sm text-text-slate">{t('Reason')}: {review.reportReason}</span>}
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!review.comment}
                        onClick={() => {
                          setReviewToReport(review)
                          setReportReason('')
                        }}
                      >
                        {t('Report comment')}
                      </Button>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {mealEditor !== undefined && (
        <MealEditor
          meal={mealEditor}
          busy={busy}
          onClose={() => setMealEditor(undefined)}
          onSave={saveMeal}
        />
      )}
      <ConfirmDialog
        open={mealToDelete !== null}
        title={t('Delete this meal?')}
        message={t('This removes the meal from your menu.')}
        confirmLabel={t('Delete meal')}
        busy={busy}
        destructive
        onConfirm={() => void deleteMeal()}
        onClose={() => setMealToDelete(null)}
      />
      <Modal
        open={reviewToReport !== null}
        onClose={() => setReviewToReport(null)}
        title={t('Report this comment')}
        size="md"
      >
        <div className="space-y-4">
          <p className="rounded-lg bg-surface-cream p-3 text-sm text-text-slate">{reviewToReport?.comment}</p>
          <label className="grid gap-2 text-sm font-semibold text-text-main">
            {t('Reason for report')}
            <textarea
              className="min-h-24 rounded-lg border border-border-subtle bg-surface-white px-3 py-2 font-normal text-text-main"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              maxLength={500}
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => setReviewToReport(null)}>{t('Cancel')}</Button>
            <Button
              variant="danger"
              loading={busy}
              disabled={!reportReason.trim()}
              onClick={() => void reportReview()}
            >
              {t('Send to admin')}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}

function OrderCard({
  order,
  meals,
  busy,
  onAdvance,
}: {
  order: Order
  meals: Map<number, MenuItem>
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
