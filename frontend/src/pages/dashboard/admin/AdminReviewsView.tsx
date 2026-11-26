import { useMemo, useState } from 'react'
import { ConfirmDialog } from '@/pages/dashboard/components/ConfirmDialog'
import { DataTable } from '@/pages/dashboard/components/DataTable'
import type { Column } from '@/pages/dashboard/components/DataTable'
import { ErrorBanner } from '@/pages/dashboard/components/ErrorBanner'
import { StatusPill } from '@/pages/dashboard/components/StatusPill'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Pagination } from '@/shared/components/Pagination'
import { Select } from '@/shared/components/Select'
import { ApiError } from '@/shared/api/client'
import { useAdminAction } from '@/shared/hooks/useAdminAction'
import { useLanguage } from '@/shared/hooks/useLanguage'
import { adminReviewsService } from '@/shared/services/adminReviews.service'
import type { AdminReviewRow, AdminReviewsListQuery, ReviewLookups } from '@/shared/services/adminReviews.service'
import type { PaginatedResponse } from '@/shared/types'

type TriState = 'all' | 'yes' | 'no'

interface AdminReviewsViewProps {
  reviews: AdminReviewRow[]
  meta: PaginatedResponse<AdminReviewRow>['meta']
  lookups: ReviewLookups
  query: AdminReviewsListQuery
  onQueryChange: (query: AdminReviewsListQuery) => void
  /** Called after every change so the list reloads. */
  onChanged: () => void
}

function toTriState(value: boolean | undefined): TriState {
  return value === undefined ? 'all' : value ? 'yes' : 'no'
}

function fromTriState(value: string): boolean | undefined {
  return value === 'all' ? undefined : value === 'yes'
}

export function AdminReviewsView({ reviews, meta, lookups, query, onQueryChange, onChanged }: AdminReviewsViewProps) {
  const { t } = useLanguage()
  const [target, setTarget] = useState<AdminReviewRow | null>(null)
  const { run, busyKey, error, clearError } = useAdminAction(onChanged)

  const namesById = useMemo(() => {
    const meals = new Map(lookups.meals.map((meal) => [meal.id, meal.name]))
    const restaurants = new Map(lookups.restaurants.map((restaurant) => [restaurant.id, restaurant.name]))
    return { meals, restaurants }
  }, [lookups])

  const clearFilters = () => {
    onQueryChange({ page: 1, limit: query.limit })
  }

  const reviewErrorMessage = (failure: unknown): Error => {
    if (failure instanceof ApiError) {
      if (failure.code === 'NOT_FOUND') return new Error(t('Review not found.'))
    }
    return failure instanceof Error ? failure : new Error(t('Something went wrong.'))
  }

  const hideReview = (review: AdminReviewRow) =>
    run(`${review.id}:hide`, () =>
      adminReviewsService.hideReview(review.id).catch((failure: unknown) => {
        throw reviewErrorMessage(failure)
      }),
    )

  const dismissReport = (review: AdminReviewRow) =>
    run(`${review.id}:dismiss`, () =>
      adminReviewsService.dismissReport(review.id).catch((failure: unknown) => {
        throw reviewErrorMessage(failure)
      }),
    )

  const confirmHide = async () => {
    if (!target) return
    await hideReview(target)
    setTarget(null) // on failure the error banner explains why
  }

  const columns: Column<AdminReviewRow>[] = [
    {
      key: 'id',
      header: t('Review'),
      rowHeader: true,
      cell: (review) => `#${review.id.slice(-6).toUpperCase()}`,
    },
    { key: 'customer', header: t('Customer'), cell: (review) => review.customerName },
    {
      key: 'meal',
      header: t('Meal'),
      cell: (review) => t(namesById.meals.get(review.menuItemId) ?? `Meal #${review.menuItemId.slice(-6).toUpperCase()}`),
    },
    {
      key: 'restaurant',
      header: t('Restaurant'),
      cell: (review) => t(namesById.restaurants.get(review.restaurantId) ?? '—'),
    },
    { key: 'rating', header: t('Rating'), cell: (review) => `${review.rating}/5` },
    {
      key: 'comment',
      header: t('Comment'),
      className: 'max-w-xs whitespace-normal break-words',
      cell: (review) => review.comment ?? '—',
    },
    {
      key: 'moderation',
      header: t('Report'),
      cell: (review) => (
        <div className="space-y-1">
          {review.isHidden ? (
            <StatusPill tone="neutral">{t('Hidden')}</StatusPill>
          ) : review.isReported ? (
            <>
              <StatusPill tone="bad">{t('Reported')}</StatusPill>
              {review.reportReason && <p className="text-xs text-text-slate">{review.reportReason}</p>}
            </>
          ) : (
            <StatusPill tone="good">{t('Not reported')}</StatusPill>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: t('Actions'),
      cell: (review) =>
        review.isHidden ? null : (
          <div className="flex flex-wrap gap-2">
            {review.isReported && (
              <Button
                size="sm"
                variant="secondary"
                loading={busyKey === `${review.id}:dismiss`}
                onClick={() => void dismissReport(review)}
              >
                {t('Dismiss report')}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={busyKey !== null}
              onClick={() => setTarget(review)}
            >
              {t('Hide review')}
            </Button>
          </div>
        ),
    },
  ]

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label={t('Filter reviews')}
          value={toTriState(query.reported)}
          onChange={(event) =>
            onQueryChange({ ...query, reported: fromTriState(event.target.value), page: 1 })
          }
        >
          <option value="all">{t('All reviews')}</option>
          <option value="yes">{t('Reported only')}</option>
          <option value="no">{t('Not reported')}</option>
        </Select>
        <Select
          aria-label={t('Filter by visibility')}
          value={toTriState(query.isHidden)}
          onChange={(event) =>
            onQueryChange({ ...query, isHidden: fromTriState(event.target.value), page: 1 })
          }
        >
          <option value="all">{t('All reviews')}</option>
          <option value="yes">{t('Hidden only')}</option>
          <option value="no">{t('Visible only')}</option>
        </Select>
      </div>

      <p className="text-sm text-text-slate" aria-live="polite">
        {t('Reviews')}: {meta.total}
      </p>

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {reviews.length === 0 ? (
        <EmptyState
          title={t('No reviews match your filters')}
          description={t('Try a different search or clear the filters.')}
          action={<Button onClick={clearFilters}>{t('Clear filters')}</Button>}
        />
      ) : (
        <>
          <DataTable caption={t('Reviews')} columns={columns} rows={reviews} getRowKey={(review) => review.id} />
          <Pagination
            currentPage={query.page}
            totalPages={meta.total_pages}
            onPageChange={(page) => onQueryChange({ ...query, page })}
          />
        </>
      )}

      <ConfirmDialog
        open={target !== null}
        title={t('Hide this review?')}
        message={t('This removes the review from public lists and rating totals.')}
        confirmLabel={t('Hide review')}
        busy={target !== null && busyKey === `${target.id}:hide`}
        destructive
        onConfirm={() => void confirmHide()}
        onClose={() => setTarget(null)}
      />
    </Card>
  )
}
