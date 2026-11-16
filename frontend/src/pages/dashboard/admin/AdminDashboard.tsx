import { AdminOverviewView } from '@/pages/dashboard/admin/AdminOverviewView'
import { Button } from '@/shared/components/Button'
import { EmptyState } from '@/shared/components/EmptyState'
import { Spinner } from '@/shared/components/Spinner'
import { useAdminOverview } from '@/shared/hooks/useDashboard'
import { useLanguage } from '@/shared/hooks/useLanguage'

export default function AdminDashboard() {
  const { t } = useLanguage()
  const { data, loading, error, retry } = useAdminOverview()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text-main">{t('Admin dashboard')}</h1>
        <p className="mt-1 text-sm text-text-slate">{t('Platform overview')}</p>
      </header>

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
        <AdminOverviewView overview={data} />
      )}
    </div>
  )
}
