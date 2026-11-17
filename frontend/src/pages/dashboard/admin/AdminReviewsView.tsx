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
import type { AdminReviewRow } from '@/shared/services/admin.service'

const PAGE_SIZE = 8
type ReportFilter = 'all' | 'reported' | 'not-reported'

function matchesQuery(review: AdminReviewRow, query: string): boolean {
  const needle = query.trim().toLowerCase()
  return !needle || [
    String(review.id),
    review.customerName,
    review.menuItemName,
    review.restaurantName,
    review.comment ?? '',
    review.reportReason ?? '',
  ].some((value) => value.toLowerCase().includes(needle))
}

interface AdminReviewsViewProps {
  reviews: AdminReviewRow[]
  onChanged: () => void
}

export function AdminReviewsView({ reviews, onChanged }: AdminReviewsViewProps) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<AdminReviewRow | null>(null)
  const { run, busyKey, error, clearError } = useAdminAction(onChanged)

  const filtered = useMemo(
    () =>
      reviews.filter(
        (review) =>
          (reportFilter === 'all' ||
            review.isReported === (reportFilter === 'reported')) &&
          matchesQuery(review, query),
      ),
    [reviews, reportFilter, query],
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
    setReportFilter('all')
    setPage(1)
  }

  const confirmDelete = async () => {
    if (!target) return
    await run(target.id, () => adminService.deleteReview(target.id))
    setTarget(null)
  }

  const columns: Column<AdminReviewRow>[] = [
    {
      key: 'id',
      header: t('Review'),
      rowHeader: true,
      cell: (review) => `#${review.id}`,
    },
    { key: 'customer', header: t('Customer'), cell: (review) => review.customerName },
    {
      key: 'meal',
      header: t('Meal'),
      cell: (review) => t(review.menuItemName),
    },
    {
      key: 'restaurant',
      header: t('Restaurant'),
      cell: (review) => t(review.restaurantName),
    },
    { key: 'rating', header: t('Rating'), cell: (review) => `${review.rating}/5` },
    {
      key: 'comment',
      header: t('Comment'),
      className: 'max-w-xs whitespace-normal break-words',
      cell: (review) => review.comment ?? '—',
    },
    {
      key: 'report',
      header: t('Report'),
      cell: (review) =>
        review.isReported ? (
          <div className="space-y-1">
            <StatusPill tone="bad">{t('Reported')}</StatusPill>
            {review.reportReason && <p className="text-xs text-text-slate">{review.reportReason}</p>}
          </div>
        ) : (
          <StatusPill tone="good">{t('Not reported')}</StatusPill>
        ),
    },
    {
      key: 'actions',
      header: t('Actions'),
      cell: (review) => (
        <Button
          size="sm"
          variant="danger"
          disabled={busyKey === review.id}
          onClick={() => setTarget(review)}
        >
          {t('Delete review')}
        </Button>
      ),
    },
  ]

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          className="min-w-60 flex-1"
          label={t('Search reviews')}
          placeholder={t('Search by comment, customer or meal')}
          value={query}
          onChange={changeFilter(setQuery)}
        />
        <Select
          aria-label={t('Filter reviews')}
          value={reportFilter}
          onChange={(event) => changeFilter(setReportFilter)(event.target.value as ReportFilter)}
        >
          <option value="all">{t('All reviews')}</option>
          <option value="reported">{t('Reported only')}</option>
          <option value="not-reported">{t('Not reported')}</option>
        </Select>
      </div>

      <p className="text-sm text-text-slate" aria-live="polite">
        {t('Reviews')}: {filtered.length}
      </p>

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {filtered.length === 0 ? (
        <EmptyState
          title={t('No reviews match your filters')}
          description={t('Try a different search or clear the filters.')}
          action={<Button onClick={clearFilters}>{t('Clear filters')}</Button>}
        />
      ) : (
        <>
          <DataTable caption={t('Reviews')} columns={columns} rows={pageRows} getRowKey={(review) => review.id} />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={target !== null}
        title={t('Delete this review?')}
        message={t('This permanently deletes the review and its comment.')}
        confirmLabel={t('Delete review')}
        busy={target !== null && busyKey === target.id}
        destructive
        onConfirm={() => void confirmDelete()}
        onClose={() => setTarget(null)}
      />
    </Card>
  )
}
