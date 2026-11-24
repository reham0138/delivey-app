import { useState } from 'react'
import { AdminRestaurantsView } from '@/pages/dashboard/admin/AdminRestaurantsView'
import { PageHeader } from '@/pages/dashboard/components/PageHeader'
import { Button } from '@/shared/components/Button'
import { EmptyState } from '@/shared/components/EmptyState'
import { Spinner } from '@/shared/components/Spinner'
import { useAdminRestaurants } from '@/shared/hooks/useAdmin'
import { useLanguage } from '@/shared/hooks/useLanguage'
import type { AdminRestaurantListQuery } from '@/shared/services/admin.service'

export default function AdminRestaurantsPage() {
  const { t } = useLanguage()
  const [query, setQuery] = useState<AdminRestaurantListQuery>({ page: 1, limit: 8 })
  const { data, loading, error, retry, refresh } = useAdminRestaurants(query)

  return (
    <div className="space-y-6">
      <PageHeader title={t('Restaurants')} description={t('Activate or deactivate restaurants.')} />

      {loading ? (
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
        <AdminRestaurantsView
          restaurants={data.data}
          meta={data.meta}
          query={query}
          onQueryChange={setQuery}
          onChanged={refresh}
        />
      )}
    </div>
  )
}
