import { useEffect, useMemo, useState } from 'react'
import { AdminUsersView } from '@/pages/dashboard/admin/AdminUsersView'
import { PageHeader } from '@/pages/dashboard/components/PageHeader'
import { Button } from '@/shared/components/Button'
import { EmptyState } from '@/shared/components/EmptyState'
import { Spinner } from '@/shared/components/Spinner'
import { useAdminUsers } from '@/shared/hooks/useAdmin'
import { useLanguage } from '@/shared/hooks/useLanguage'
import type { AdminUsersListQuery } from '@/shared/services/adminUsers.service'

export default function AdminUsersPage() {
  const { t } = useLanguage()
  const [query, setQuery] = useState<AdminUsersListQuery>({ page: 1, limit: 8 })
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch((query.search ?? '').trim()), 400)
    return () => window.clearTimeout(timer)
  }, [query.search])

  const apiQuery = useMemo<AdminUsersListQuery>(
    () => ({ ...query, search: debouncedSearch || undefined }),
    [query, debouncedSearch],
  )
  const { data, loading, error, retry, refresh } = useAdminUsers(apiQuery)

  return (
    <div className="space-y-6">
      <PageHeader title={t('Users')} description={t('Search accounts and suspend or reactivate them.')} />

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
        <AdminUsersView
          users={data.data}
          meta={data.meta}
          query={query}
          onQueryChange={setQuery}
          onChanged={refresh}
        />
      )}
    </div>
  )
}
