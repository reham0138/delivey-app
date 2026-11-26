import { useEffect, useMemo, useState } from 'react'
import { AdminOrdersView } from '@/pages/dashboard/admin/AdminOrdersView'
import { PageHeader } from '@/pages/dashboard/components/PageHeader'
import { Button } from '@/shared/components/Button'
import { EmptyState } from '@/shared/components/EmptyState'
import { Spinner } from '@/shared/components/Spinner'
import { useAdminOrderRestaurants, useAdminOrders } from '@/shared/hooks/useAdmin'
import { useLanguage } from '@/shared/hooks/useLanguage'
import type { AdminOrdersListQuery } from '@/shared/services/adminOrders.service'

export default function AdminOrdersPage() {
  const { t } = useLanguage()
  const [query, setQuery] = useState<AdminOrdersListQuery>({ page: 1, limit: 8 })
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch((query.search ?? '').trim()), 400)
    return () => window.clearTimeout(timer)
  }, [query.search])

  const apiQuery = useMemo<AdminOrdersListQuery>(
    () => ({ ...query, search: debouncedSearch || undefined }),
    [query, debouncedSearch],
  )
  const { data, loading, error, retry, refresh } = useAdminOrders(apiQuery)
  const { data: restaurants, loading: restaurantsLoading } = useAdminOrderRestaurants()

  return (
    <div className="space-y-6">
      <PageHeader title={t('Orders')} description={t('View and manage all platform orders.')} />

      {loading || restaurantsLoading ? (
        <div className="flex justify-center py-16">
          <Spinner label={t('Loading...')} />
        </div>
      ) : error || !data ? (
        <EmptyState
          title={t('Something went wrong')}
          description={error ?? t('No data available.')}
          action={<Button onClick={retry}>{t('Try again')}</Button>}
        />
      ) : (
        <AdminOrdersView
          orders={data.data}
          meta={data.meta}
          restaurants={restaurants ?? []}
          query={query}
          onQueryChange={setQuery}
          onChanged={refresh}
        />
      )}
    </div>
  )
}
