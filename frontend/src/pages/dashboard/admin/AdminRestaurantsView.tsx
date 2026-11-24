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
import { useAdminAction } from '@/shared/hooks/useAdminAction'
import { useLanguage } from '@/shared/hooks/useLanguage'
import { adminService } from '@/shared/services/admin.service'
import type { AdminRestaurantListQuery } from '@/shared/services/admin.service'
import type { PaginatedResponse, Restaurant } from '@/shared/types'

type ActiveFilter = 'all' | 'active' | 'inactive'

interface AdminRestaurantsViewProps {
  restaurants: Restaurant[]
  meta: PaginatedResponse<Restaurant>['meta']
  query: AdminRestaurantListQuery
  onQueryChange: (query: AdminRestaurantListQuery) => void
  onChanged: () => void
}

export function AdminRestaurantsView({
  restaurants,
  meta,
  query,
  onQueryChange,
  onChanged,
}: AdminRestaurantsViewProps) {
  const { t } = useLanguage()
  const [target, setTarget] = useState<Restaurant | null>(null)
  const { run, busyKey, error, clearError } = useAdminAction(onChanged)

  const clearFilters = () => {
    onQueryChange({ page: 1, limit: query.limit })
  }
  const activeFilter: ActiveFilter =
    query.isActive === undefined ? 'all' : query.isActive ? 'active' : 'inactive'

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
          value={query.search ?? ''}
          onChange={(search) => onQueryChange({ ...query, search: search || undefined, page: 1 })}
        />
        <Select
          aria-label={t('Filter by status')}
          value={activeFilter}
          onChange={(event) => onQueryChange({
            ...query,
            isActive: event.target.value === 'all' ? undefined : event.target.value === 'active',
            page: 1,
          })}
        >
          <option value="all">{t('All statuses')}</option>
          <option value="active">{t('Active')}</option>
          <option value="inactive">{t('Inactive')}</option>
        </Select>
      </div>

      <p className="text-sm text-text-slate" aria-live="polite">
        {t('Restaurants')}: {meta.total}
      </p>

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {restaurants.length === 0 ? (
        <EmptyState
          title={t('No restaurants match your filters')}
          description={t('Try a different search or clear the filters.')}
          action={<Button onClick={clearFilters}>{t('Clear filters')}</Button>}
        />
      ) : (
        <>
          <DataTable caption={t('Restaurants')} columns={columns} rows={restaurants} getRowKey={(restaurant) => restaurant.id} />
          <Pagination
            currentPage={query.page}
            totalPages={meta.total_pages}
            onPageChange={(page) => onQueryChange({ ...query, page })}
          />
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
