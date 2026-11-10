import { useMemo, useState } from 'react'

import { useLanguage } from '../hooks/useLanguage'
import type { Review } from '../types'
import { formatDateTime } from '../utils/format'
import { Card } from './Card'
import { EmptyState } from './EmptyState'
import { Pagination } from './Pagination'
import { Rating } from './Rating'

const REVIEWS_PER_PAGE = 5

interface ReviewListProps {
  reviews: Review[]
}

export function ReviewList({ reviews }: ReviewListProps) {
  const { t } = useLanguage()
  const [requestedPage, setRequestedPage] = useState(1)

  const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE)
  const currentPage = Math.min(requestedPage, totalPages)
  const visibleReviews = reviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE,
  )
  const averageRating = useMemo(
    () => reviews.length
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : 0,
    [reviews],
  )

  if (reviews.length === 0) {
    return (
      <Card>
        <EmptyState
          title={t('No reviews yet')}
          description={t('Be the first to share your experience.')}
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-slate">
              {t('Average rating')}
            </p>
            <Rating value={Number(averageRating.toFixed(1))} />
          </div>
          <p className="text-sm text-text-slate">
            {t('Based on {count} reviews', { count: reviews.length })}
          </p>
        </div>
      </Card>

      <div className="space-y-3">
        {visibleReviews.map((review) => (
          <Card key={review.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-text-main">{review.customerName}</p>
                <time dateTime={review.createdAt} className="mt-1 block text-xs text-text-slate">
                  {formatDateTime(review.createdAt)}
                </time>
              </div>
              <Rating value={review.rating} />
            </div>
            {review.comment && (
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-text-slate">
                {review.comment}
              </p>
            )}
          </Card>
        ))}
      </div>

      {reviews.length > REVIEWS_PER_PAGE && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setRequestedPage}
        />
      )}
    </div>
  )
}
