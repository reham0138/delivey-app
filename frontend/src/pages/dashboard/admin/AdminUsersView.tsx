import { useMemo, useState } from 'react'
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
import { useAdminAction } from '@/shared/hooks/useAdminAction'
import { useLanguage } from '@/shared/hooks/useLanguage'
import { adminService } from '@/shared/services/admin.service'
import type { AdminUserRow } from '@/shared/services/admin.service'
import type { AccountStatus, UserRole } from '@/shared/types'
import { formatDate } from '@/shared/utils/formatDate'

const PAGE_SIZE = 8
const ROLE_LABELS: Record<UserRole, string> = { admin: 'Admin', restaurant: 'Restaurant owner', customer: 'Customer' }

function matchesQuery(user: AdminUserRow, query: string): boolean {
  const needle = query.trim().toLowerCase()
  return !needle || [user.name, user.email, user.phone].some((value) => value.toLowerCase().includes(needle))
}

interface AdminUsersViewProps {
  users: AdminUserRow[]
  /** Called after every change so the list reloads. */
  onChanged: () => void
}

export function AdminUsersView({ users, onChanged }: AdminUsersViewProps) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const [status, setStatus] = useState<AccountStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<AdminUserRow | null>(null)
  const { run, busyKey, error, clearError } = useAdminAction(onChanged)

  const filtered = useMemo(
    () =>
      users.filter(
        (user) =>
          (role === 'all' || user.role === role) &&
          (status === 'all' || user.status === status) &&
          matchesQuery(user, query),
      ),
    [users, role, status, query],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages) // the list can shrink after a change
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Changing a filter always goes back to page 1.
  const changeFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }
  const clearFilters = () => {
    setQuery('')
    setRole('all')
    setStatus('all')
    setPage(1)
  }

  const changeStatus = (user: AdminUserRow, next: AccountStatus) =>
    run(user.email, () => adminService.setUserStatus(user.email, next))

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
      cell: (user) => (user.createdAt ? formatDate(user.createdAt) : '—'),
    },
    {
      key: 'actions',
      header: t('Actions'),
      cell: (user) => {
        if (user.role === 'admin') return <span className="text-xs text-text-slate">{t('Protected account')}</span>
        if (user.status === 'active') {
          return (
            <Button size="sm" variant="outline" disabled={busyKey === user.email} onClick={() => setTarget(user)}>
              {t('Suspend')}
            </Button>
          )
        }
        return (
          <Button
            size="sm"
            variant="secondary"
            loading={busyKey === user.email}
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
          value={query}
          onChange={changeFilter(setQuery)}
        />
        <Select
          aria-label={t('Filter by role')}
          value={role}
          onChange={(event) => changeFilter(setRole)(event.target.value as UserRole | 'all')}
        >
          <option value="all">{t('All roles')}</option>
          <option value="admin">{t('Admin')}</option>
          <option value="restaurant">{t('Restaurant owner')}</option>
          <option value="customer">{t('Customer')}</option>
        </Select>
        <Select
          aria-label={t('Filter by status')}
          value={status}
          onChange={(event) => changeFilter(setStatus)(event.target.value as AccountStatus | 'all')}
        >
          <option value="all">{t('All statuses')}</option>
          <option value="active">{t('Active')}</option>
          <option value="suspended">{t('Suspended')}</option>
        </Select>
      </div>

      <p className="text-sm text-text-slate" aria-live="polite">
        {t('Users')}: {filtered.length}
      </p>

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {filtered.length === 0 ? (
        <EmptyState
          title={t('No users match your filters')}
          description={t('Try a different search or clear the filters.')}
          action={<Button onClick={clearFilters}>{t('Clear filters')}</Button>}
        />
      ) : (
        <>
          <DataTable caption={t('Users')} columns={columns} rows={pageRows} getRowKey={(user) => user.email} />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={target !== null}
        title={t('Suspend this account?')}
        message={t('{name} will not be able to log in until you reactivate the account.', { name: target?.name ?? '' })}
        confirmLabel={t('Suspend')}
        busy={target !== null && busyKey === target.email}
        destructive
        onConfirm={() => void confirmSuspend()}
        onClose={() => setTarget(null)}
      />
    </Card>
  )
}