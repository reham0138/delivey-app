import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ClipboardList, MessageSquare, Utensils } from 'lucide-react'

import { Button } from '@/shared/components/Button'
import { EmptyState } from '@/shared/components/EmptyState'
import { Spinner } from '@/shared/components/Spinner'
import { useAuth } from '@/shared/hooks/useAuth'
import { useLanguage } from '@/shared/hooks/useLanguage'
import { restaurantDashboardService } from '@/shared/services/restaurantDashboard.service'
import type { OrderStatus, Review } from '@/shared/types'
import type { MealChanges, DashboardTabId, RestaurantDashboardData } from './RestaurantDashboardTabs'
import {
  RestaurantDashboardMealsTab,
} from './RestaurantDashboardMealsTab'
import {
  RestaurantDashboardOrdersTab,
} from './RestaurantDashboardOrdersTab'
import {
  RestaurantDashboardOverviewTab,
} from './RestaurantDashboardOverviewTab'
import {
  RestaurantDashboardReviewsTab,
} from './RestaurantDashboardReviewsTab'

const EMPTY_DATA: RestaurantDashboardData = { restaurant: null, meals: [], orders: [], reviews: [] }

const tabs: { id: DashboardTabId; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Utensils aria-hidden="true" size={17} /> },
  { id: 'meals', label: 'Meals', icon: <Utensils aria-hidden="true" size={17} /> },
  { id: 'orders', label: 'Orders', icon: <ClipboardList aria-hidden="true" size={17} /> },
  { id: 'reviews', label: 'Reviews', icon: <MessageSquare aria-hidden="true" size={17} /> },
]

export default function RestaurantDashboard() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [data, setData] = useState<RestaurantDashboardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [actionError, setActionError] = useState('')
  const [tab, setTab] = useState<DashboardTabId>('overview')
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

  const saveMeal = (meal: RestaurantDashboardData['meals'][number] | null, changes: MealChanges) => {
    if (!user) return Promise.resolve(false)
    return runAction(async () => {
      if (meal) {
        await restaurantDashboardService.updateMeal(user.id, meal.id, changes)
      } else {
        await restaurantDashboardService.createMeal(user.id, changes)
      }
    })
  }

  const deleteMeal = (meal: RestaurantDashboardData['meals'][number]) => {
    if (!user) return Promise.resolve(false)
    return runAction(() => restaurantDashboardService.deleteMeal(user.id, meal.id))
  }

  const reportReview = (review: Review, reason: string) => {
    if (!user) return Promise.resolve(false)
    return runAction(() =>
      restaurantDashboardService.reportReview(review.id, reason),
    )
  }

  const updateOrder = (orderId: string, status: OrderStatus) => {
    if (!user) return
    void runAction(() => restaurantDashboardService.updateOrderStatus(orderId, status))
  }

  const cancelOrder = (orderId: string, reason: string) => {
    if (!user) return Promise.resolve(false)
    return runAction(() => restaurantDashboardService.cancelOrder(orderId, reason))
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
      {!restaurant.isActive && (
        <p role="status" className="rounded-lg border border-brand-yellow/40 bg-brand-yellow/20 px-4 py-3 text-sm text-text-main">
          <strong>{t('Pending approval')}</strong> {t('Your restaurant is awaiting admin approval.')}
        </p>
      )}

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
        <div hidden={tab !== 'overview'}>
          <RestaurantDashboardOverviewTab data={data} onSelectTab={setTab} />
        </div>
        <div hidden={tab !== 'meals'}>
          <RestaurantDashboardMealsTab
            meals={data.meals}
            busy={busy}
            onSaveMeal={saveMeal}
            onDeleteMeal={deleteMeal}
          />
        </div>
        <div hidden={tab !== 'orders'}>
          <RestaurantDashboardOrdersTab
            orders={data.orders}
            mealById={mealById}
            busy={busy}
            onUpdateOrder={updateOrder}
            onCancelOrder={cancelOrder}
          />
        </div>
        <div hidden={tab !== 'reviews'}>
          <RestaurantDashboardReviewsTab
            reviews={data.reviews}
            restaurant={restaurant}
            mealById={mealById}
            busy={busy}
            onReportReview={reportReview}
          />
        </div>
      </div>
    </section>
  )
}
