import { Button } from '@/shared/components/Button'
import { EmptyState } from '@/shared/components/EmptyState'
import { Spinner } from '@/shared/components/Spinner'
import { useRestaurantOverview } from '@/shared/hooks/useDashboard'
import { useAuth } from '@/shared/hooks/useAuth'
import { useLanguage } from '@/shared/hooks/useLanguage'

// TEMPORARY (Step 3): prints the raw data so we can see the data layer works. Step 4 replaces it with real UI.
export default function RestaurantDashboard() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { data, loading, error, retry } = useRestaurantOverview(user?.id ?? 0)

  if (loading) return <Spinner label={t('Loading...')} />
  if (error) {
    return (
      <EmptyState
        title={t('Something went wrong')}
        description={error}
        action={<Button onClick={retry}>{t('Try again')}</Button>}
      />
    )
  }
  if (!data?.restaurant) {
    return (
      <EmptyState
        title={t('No restaurant linked to this account')}
        description={t('Ask an administrator to connect your account to a restaurant.')}
      />
    )
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-text-main">{data.restaurant.name}</h1>
      <pre className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-white p-4 text-xs text-text-main">
        {JSON.stringify({ stats: data.stats, ordersLoaded: data.orders.length }, null, 2)}
      </pre>
    </section>
  )
}
