import { AdminOrdersView } from '@/pages/dashboard/admin/AdminOrdersView'
import { PageHeader } from '@/pages/dashboard/components/PageHeader'
import { Button } from '@/shared/components/Button'
import { EmptyState } from '@/shared/components/EmptyState'
import { Spinner } from '@/shared/components/Spinner'
import { useAdminOrders } from '@/shared/hooks/useAdmin'
import { useLanguage } from '@/shared/hooks/useLanguage'

export default function AdminOrdersPage() {
  const { t } = useLanguage()
  const { data, loading, error, retry, refresh } = useAdminOrders()

  return (
    <div className="space-y-6">
      <PageHeader title={t('Orders')} description={t('View and manage all platform orders.')} />

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
        <AdminOrdersView orders={data} onChanged={refresh} />
      )}
    </div>
  )
}
