import { AdminMealsView } from '@/pages/dashboard/admin/AdminMealsView'
import { PageHeader } from '@/pages/dashboard/components/PageHeader'
import { Button } from '@/shared/components/Button'
import { EmptyState } from '@/shared/components/EmptyState'
import { Spinner } from '@/shared/components/Spinner'
import { useAdminMeals } from '@/shared/hooks/useAdmin'
import { useLanguage } from '@/shared/hooks/useLanguage'

export default function AdminMealsPage() {
  const { t } = useLanguage()
  const { data, loading, error, retry, refresh } = useAdminMeals()

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
        <AdminMealsView meals={data} onChanged={refresh} />
      )}
    </div>
  )
}
