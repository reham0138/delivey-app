import { useMemo, useState } from 'react'
import { AdminReviewsView } from '@/pages/dashboard/admin/AdminReviewsView'
import { PageHeader } from '@/pages/dashboard/components/PageHeader'
import { Button } from '@/shared/components/Button'
import { EmptyState } from '@/shared/components/EmptyState'
import { Spinner } from '@/shared/components/Spinner'
import { useAdminReviewLookups, useAdminReviews } from '@/shared/hooks/useAdmin'
import { useLanguage } from '@/shared/hooks/useLanguage'
import type { AdminReviewsListQuery } from '@/shared/services/adminReviews.service'

export default function AdminReviewsPage() {
  const { t } = useLanguage()
  const [query, setQuery] = useState<AdminReviewsListQuery>({ page: 1, limit: 8 })
  const { data, loading, error, retry, refresh } = useAdminReviews(query)
  const { data: lookups, loading: lookupsLoading } = useAdminReviewLookups()

  const emptyLookups = useMemo(() => ({ restaurants: [], meals: [] }), [])

  return (
    <div className="space-y-6">
      <PageHeader title={t('Reviews')} description={t('Review customer ratings and comments.')} />

      {loading || lookupsLoading ? (
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
        <AdminReviewsView
          reviews={data.data}
          meta={data.meta}
          lookups={lookups ?? emptyLookups}
          query={query}
          onQueryChange={setQuery}
          onChanged={refresh}
        />
      )}
    </div>
  )
}
