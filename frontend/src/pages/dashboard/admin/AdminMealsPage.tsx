import { useState } from 'react'
import { AdminMealsView } from '@/pages/dashboard/admin/AdminMealsView'
import { PageHeader } from '@/pages/dashboard/components/PageHeader'
import { Button } from '@/shared/components/Button'
import { EmptyState } from '@/shared/components/EmptyState'
import { Spinner } from '@/shared/components/Spinner'
import { useAdminMeals } from '@/shared/hooks/useAdmin'
import { useLanguage } from '@/shared/hooks/useLanguage'
import type { AdminMealListQuery } from '@/shared/services/admin.service'

export default function AdminMealsPage() {
  const { t } = useLanguage()
  const [query, setQuery] = useState<AdminMealListQuery>({ page: 1, limit: 8 })
  const { data, loading, error, retry, refresh } = useAdminMeals(query)

  return (
    <div className="space-y-6">
      <PageHeader title={t('Meals')} description={t('Manage menu availability for customers.')} />

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
        <AdminMealsView
          meals={data.data}
          meta={data.meta}
          query={query}
          onQueryChange={setQuery}
          onChanged={refresh}
        />
      )}
    </div>
  )
}
