import { useMemo, useState } from 'react'
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
import type { AdminMealRow } from '@/shared/services/admin.service'
import { formatCurrency } from '@/shared/utils/format'

const PAGE_SIZE = 8
type AvailabilityFilter = 'all' | 'available' | 'unavailable'

function matchesQuery(meal: AdminMealRow, query: string): boolean {
  const needle = query.trim().toLowerCase()
  return !needle || [meal.name, meal.restaurantName, meal.category].some((value) => value.toLowerCase().includes(needle))
}

interface AdminMealsViewProps {
  meals: AdminMealRow[]
  onChanged: () => void
}

export function AdminMealsView({ meals, onChanged }: AdminMealsViewProps) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [page, setPage] = useState(1)
  const { run, busyKey, error, clearError } = useAdminAction(onChanged)

  const filtered = useMemo(
    () =>
      meals.filter(
        (meal) =>
          (availability === 'all' || meal.isAvailable === (availability === 'available')) &&
          matchesQuery(meal, query),
      ),
    [meals, availability, query],
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
    setAvailability('all')
    setPage(1)
  }
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
          value={query}
          onChange={changeFilter(setQuery)}
        />
        <Select
          aria-label={t('Filter by availability')}
          value={availability}
          onChange={(event) => changeFilter(setAvailability)(event.target.value as AvailabilityFilter)}
        >
          <option value="all">{t('All availability')}</option>
          <option value="available">{t('Available')}</option>
          <option value="unavailable">{t('Unavailable')}</option>
        </Select>
      </div>

      <p className="text-sm text-text-slate" aria-live="polite">
        {t('Meals')}: {filtered.length}
      </p>

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {filtered.length === 0 ? (
        <EmptyState
          title={t('No meals match your filters')}
          description={t('Try a different search or clear the filters.')}
          action={<Button onClick={clearFilters}>{t('Clear filters')}</Button>}
        />
      ) : (
        <>
          <DataTable caption={t('Meals')} columns={columns} rows={pageRows} getRowKey={(meal) => meal.id} />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </Card>
  )
}
