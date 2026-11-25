import { useState } from 'react'
import { ConfirmDialog } from '@/pages/dashboard/components/ConfirmDialog'
import { DataTable } from '@/pages/dashboard/components/DataTable'
import type { Column } from '@/pages/dashboard/components/DataTable'
import { ErrorBanner } from '@/pages/dashboard/components/ErrorBanner'
import { SearchField } from '@/pages/dashboard/components/SearchField'
import { StatusPill } from '@/pages/dashboard/components/StatusPill'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Pagination } from '@/shared/components/Pagination'
import { Select } from '@/shared/components/Select'
import { ApiError } from '@/shared/api/client'
import { useAdminAction } from '@/shared/hooks/useAdminAction'
import { useLanguage } from '@/shared/hooks/useLanguage'
import { adminUsersService } from '@/shared/services/adminUsers.service'
import type { AdminUserRow, AdminUsersListQuery } from '@/shared/services/adminUsers.service'
import type { AccountStatus, PaginatedResponse, UserRole } from '@/shared/types'
import { formatDate } from '@/shared/utils/formatDate'

const ROLE_LABELS: Record<UserRole, string> = { admin: 'Admin', restaurant: 'Restaurant owner', customer: 'Customer' }

interface AdminUsersViewProps {
  users: AdminUserRow[]
  meta: PaginatedResponse<AdminUserRow>['meta']
  query: AdminUsersListQuery
  onQueryChange: (query: AdminUsersListQuery) => void
  /** Called after every change so the list reloads. */
  onChanged: () => void
}

export function AdminUsersView({ users, meta, query, onQueryChange, onChanged }: AdminUsersViewProps) {
  const { t } = useLanguage()
  const [target, setTarget] = useState<AdminUserRow | null>(null)
  const { run, busyKey, error, clearError } = useAdminAction(onChanged)

  const roleFilter = query.role ?? 'all'
  const statusFilter = query.status ?? 'all'

  const clearFilters = () => {
    onQueryChange({ page: 1, limit: query.limit })
  }

  const changeStatus = (user: AdminUserRow, next: AccountStatus) =>
    run(user.id, () =>
      adminUsersService.setUserStatus(user.id, next).catch((failure: unknown) => {
        if (failure instanceof ApiError) {
          if (failure.code === 'NOT_FOUND') throw new Error(t('This user no longer exists.'))
          if (failure.code === 'FORBIDDEN') throw new Error(t('This account cannot be modified.'))
        }
        throw failure
      }),
    )

  const confirmSuspend = async () => {
    if (!target) return
    await changeStatus(target, 'suspended')
    setTarget(null) // on failure the error banner explains why
  }

  const columns: Column<AdminUserRow>[] = [
    {
      key: 'user',
      header: t('User'),
      rowHeader: true,
      cell: (user) => (
        <div className="min-w-0">
          <p className="text-text-main">{user.name}</p>
          <p className="text-xs font-normal text-text-slate">{user.email}</p>
        </div>
      ),
    },
    { key: 'role', header: t('Role'), cell: (user) => t(ROLE_LABELS[user.role]) },
    {
      key: 'status',
      header: t('Status'),
      cell: (user) => (
        <StatusPill tone={user.status === 'active' ? 'good' : 'bad'}>
          {t(user.status === 'active' ? 'Active' : 'Suspended')}
        </StatusPill>
      ),
    },
    {
      key: 'joined',
      header: t('Joined'),
      className: 'text-text-slate',
      cell: (user) => formatDate(user.createdAt),
    },
    {
      key: 'actions',
      header: t('Actions'),
      cell: (user) => {
        if (user.role === 'admin') return <span className="text-xs text-text-slate">{t('Protected account')}</span>
        if (user.status === 'active') {
          return (
            <Button size="sm" variant="outline" disabled={busyKey === user.id} onClick={() => setTarget(user)}>
              {t('Suspend')}
            </Button>
          )
        }
        return (
          <Button
            size="sm"
            variant="secondary"
            loading={busyKey === user.id}
            onClick={() => void changeStatus(user, 'active')}
          >
            {t('Reactivate')}
          </Button>
        )
      },
    },
  ]

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          className="min-w-60 flex-1"
          label={t('Search users')}
          placeholder={t('Search by name, email or phone')}
          value={query.search ?? ''}
          onChange={(search) => onQueryChange({ ...query, search: search || undefined, page: 1 })}
        />
        <Select
          aria-label={t('Filter by role')}
          value={roleFilter}
          onChange={(event) =>
            onQueryChange({
              ...query,
              role: event.target.value === 'all' ? undefined : (event.target.value as UserRole),
              page: 1,
            })
          }
        >
          <option value="all">{t('All roles')}</option>
          <option value="admin">{t('Admin')}</option>
          <option value="restaurant">{t('Restaurant owner')}</option>
          <option value="customer">{t('Customer')}</option>
        </Select>
        <Select
          aria-label={t('Filter by status')}
          value={statusFilter}
          onChange={(event) =>
            onQueryChange({
              ...query,
              status: event.target.value === 'all' ? undefined : (event.target.value as AccountStatus),
              page: 1,
            })
          }
        >
          <option value="all">{t('All statuses')}</option>
          <option value="active">{t('Active')}</option>
          <option value="suspended">{t('Suspended')}</option>
        </Select>
      </div>

      <p className="text-sm text-text-slate" aria-live="polite">
        {t('Users')}: {meta.total}
      </p>

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {users.length === 0 ? (
        <EmptyState
          title={t('No users match your filters')}
          description={t('Try a different search or clear the filters.')}
          action={<Button onClick={clearFilters}>{t('Clear filters')}</Button>}
        />
      ) : (
        <>
          <DataTable caption={t('Users')} columns={columns} rows={users} getRowKey={(user) => user.id} />
          <Pagination
            currentPage={query.page}
            totalPages={meta.total_pages}
            onPageChange={(page) => onQueryChange({ ...query, page })}
          />
        </>
      )}

      <ConfirmDialog
        open={target !== null}
        title={t('Suspend this account?')}
        message={t('{name} will not be able to log in until you reactivate the account.', { name: target?.name ?? '' })}
        confirmLabel={t('Suspend')}
        busy={target !== null && busyKey === target.id}
        destructive
        onConfirm={() => void confirmSuspend()}
        onClose={() => setTarget(null)}
      />
    </Card>
  )
}
