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
import type { AdminMealListQuery, AdminMealRow } from '@/shared/services/admin.service'
import type { PaginatedResponse } from '@/shared/types'
import { formatCurrency } from '@/shared/utils/format'

type AvailabilityFilter = 'all' | 'available' | 'unavailable'

interface AdminMealsViewProps {
  meals: AdminMealRow[]
  meta: PaginatedResponse<AdminMealRow>['meta']
  query: AdminMealListQuery
  onQueryChange: (query: AdminMealListQuery) => void
  onChanged: () => void
}

export function AdminMealsView({ meals, meta, query, onQueryChange, onChanged }: AdminMealsViewProps) {
  const { t } = useLanguage()
  const { run, busyKey, error, clearError } = useAdminAction(onChanged)

  const clearFilters = () => {
    onQueryChange({ page: 1, limit: query.limit })
  }
  const availability: AvailabilityFilter =
    query.isAvailable === undefined ? 'all' : query.isAvailable ? 'available' : 'unavailable'
  const changeAvailability = (meal: AdminMealRow) =>
    run(meal.id, () => adminService.setMealAvailability(meal.id, !meal.isAvailable))

  const columns: Column<AdminMealRow>[] = [
    {
      key: 'name',
      header: t('Meal'),
      rowHeader: true,
      cell: (meal) => (
        <div className="min-w-0">
          <p className="text-text-main">{t(meal.name)}</p>
          <p className="text-xs font-normal text-text-slate">{formatCurrency(meal.price)}</p>
        </div>
      ),
    },
    { key: 'restaurant', header: t('Restaurant'), cell: (meal) => t(meal.restaurantName) },
    { key: 'category', header: t('Category'), cell: (meal) => t(meal.category) },
    {
      key: 'availability',
      header: t('Availability'),
      cell: (meal) => (
        <StatusPill tone={meal.isAvailable ? 'good' : 'bad'}>
          {t(meal.isAvailable ? 'Available' : 'Unavailable')}
        </StatusPill>
      ),
    },
    {
      key: 'actions',
      header: t('Actions'),
      cell: (meal) => (
        <Button
          size="sm"
          variant={meal.isAvailable ? 'outline' : 'secondary'}
          loading={busyKey === meal.id}
          onClick={() => void changeAvailability(meal)}
        >
          {t(meal.isAvailable ? 'Make unavailable' : 'Make available')}
        </Button>
      ),
    },
  ]

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          className="min-w-60 flex-1"
          label={t('Search meals')}
          placeholder={t('Search by meal name, restaurant or category')}
          value={query.search ?? ''}
          onChange={(search) => onQueryChange({ ...query, search: search || undefined, page: 1 })}
        />
        <Select
          aria-label={t('Filter by availability')}
          value={availability}
          onChange={(event) => onQueryChange({
            ...query,
            isAvailable: event.target.value === 'all' ? undefined : event.target.value === 'available',
            page: 1,
          })}
        >
          <option value="all">{t('All availability')}</option>
          <option value="available">{t('Available')}</option>
          <option value="unavailable">{t('Unavailable')}</option>
        </Select>
      </div>

      <p className="text-sm text-text-slate" aria-live="polite">
        {t('Meals')}: {meta.total}
      </p>

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {meals.length === 0 ? (
        <EmptyState
          title={t('No meals match your filters')}
          description={t('Try a different search or clear the filters.')}
          action={<Button onClick={clearFilters}>{t('Clear filters')}</Button>}
        />
      ) : (
        <>
          <DataTable caption={t('Meals')} columns={columns} rows={meals} getRowKey={(meal) => meal.id} />
          <Pagination
            currentPage={query.page}
            totalPages={meta.total_pages}
            onPageChange={(page) => onQueryChange({ ...query, page })}
          />
        </>
      )}
    </Card>
  )
}
