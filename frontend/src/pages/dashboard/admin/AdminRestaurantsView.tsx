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
import type { Restaurant } from '@/shared/types'

const PAGE_SIZE = 8
type ActiveFilter = 'all' | 'active' | 'inactive'

function matchesQuery(restaurant: Restaurant, query: string): boolean {
  const needle = query.trim().toLowerCase()
  return !needle || [restaurant.name, restaurant.cuisine].some((value) => value.toLowerCase().includes(needle))
}

interface AdminRestaurantsViewProps {
  restaurants: Restaurant[]
  onChanged: () => void
}

export function AdminRestaurantsView({ restaurants, onChanged }: AdminRestaurantsViewProps) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ActiveFilter>('all')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<Restaurant | null>(null)
  const { run, busyKey, error, clearError } = useAdminAction(onChanged)

  const filtered = useMemo(
    () =>
      restaurants.filter(
        (restaurant) =>
          (status === 'all' || restaurant.isActive === (status === 'active')) &&
          matchesQuery(restaurant, query),
      ),
    [restaurants, status, query],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const changeFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }
  const clearFilters = () => {
    setQuery('')
    setStatus('all')
    setPage(1)
  }

  const changeStatus = (restaurant: Restaurant, isActive: boolean) =>
    run(restaurant.id, () => adminService.setRestaurantIsActive(restaurant.id, isActive))

  const confirmDeactivate = async () => {
    if (!target) return
    await changeStatus(target, false)
    setTarget(null)
  }

  const columns: Column<Restaurant>[] = [
    {
      key: 'name',
      header: t('Restaurant'),
      rowHeader: true,
      cell: (restaurant) => (
        <div className="min-w-0">
          <p className="text-text-main">{t(restaurant.name)}</p>
          <p className="text-xs font-normal text-text-slate">{t(restaurant.cuisine)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('Status'),
      cell: (restaurant) => (
        <StatusPill tone={restaurant.isActive ? 'good' : 'bad'}>
          {t(restaurant.isActive ? 'Active' : 'Inactive')}
        </StatusPill>
      ),
    },
    {
      key: 'actions',
      header: t('Actions'),
      cell: (restaurant) =>
        restaurant.isActive ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busyKey === restaurant.id}
            onClick={() => setTarget(restaurant)}
          >
            {t('Deactivate')}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            loading={busyKey === restaurant.id}
            onClick={() => void changeStatus(restaurant, true)}
          >
            {t('Activate')}
          </Button>
        ),
    },
  ]

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          className="min-w-60 flex-1"
          label={t('Search restaurants')}
          placeholder={t('Search by name or cuisine')}
          value={query}
          onChange={changeFilter(setQuery)}
        />
        <Select
          aria-label={t('Filter by status')}
          value={status}
          onChange={(event) => changeFilter(setStatus)(event.target.value as ActiveFilter)}
        >
          <option value="all">{t('All statuses')}</option>
          <option value="active">{t('Active')}</option>
          <option value="inactive">{t('Inactive')}</option>
        </Select>
      </div>

      <p className="text-sm text-text-slate" aria-live="polite">
        {t('Restaurants')}: {filtered.length}
      </p>

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {filtered.length === 0 ? (
        <EmptyState
          title={t('No restaurants match your filters')}
          description={t('Try a different search or clear the filters.')}
          action={<Button onClick={clearFilters}>{t('Clear filters')}</Button>}
        />
      ) : (
        <>
          <DataTable caption={t('Restaurants')} columns={columns} rows={pageRows} getRowKey={(restaurant) => restaurant.id} />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={target !== null}
        title={t('Deactivate this restaurant?')}
        message={t('This restaurant will be hidden from customers until you reactivate it.')}
        confirmLabel={t('Deactivate')}
        busy={target !== null && busyKey === target.id}
        destructive
        onConfirm={() => void confirmDeactivate()}
        onClose={() => setTarget(null)}
      />
    </Card>
  )
}
