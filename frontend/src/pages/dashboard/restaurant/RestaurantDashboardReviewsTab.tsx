import { useState } from 'react'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Modal } from '@/shared/components/Modal'
import { Rating } from '@/shared/components/Rating'
import { useLanguage } from '@/shared/hooks/useLanguage'
import type { MenuItem, Review, Restaurant } from '@/shared/types'
import { formatDateTime } from '@/shared/utils/format'
import { StatusPill } from '@/pages/dashboard/components/StatusPill'

export function RestaurantDashboardReviewsTab({
  reviews,
  restaurant,
  mealById,
  busy,
  onReportReview,
}: {
  reviews: Review[]
  restaurant: Restaurant
  mealById: Map<string, MenuItem>
  busy: boolean
  onReportReview: (review: Review, reason: string) => Promise<boolean>
}) {
  const { t } = useLanguage()
  const [reviewToReport, setReviewToReport] = useState<Review | null>(null)
  const [reportReason, setReportReason] = useState('')

  const report = async () => {
    if (!reviewToReport) return
    if (await onReportReview(reviewToReport, reportReason)) {
      setReviewToReport(null)
      setReportReason('')
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-text-main">{t('Meal and restaurant reviews')}</h2>
          <p className="text-sm text-text-slate">{t('Review comments from customers. Report offensive content for administrator review.')}</p>
        </div>
        {reviews.length === 0 ? (
          <EmptyState title={t('No reviews yet')} description={t('Customer reviews will appear here.')} />
        ) : reviews.map((review) => {
          const meal = mealById.get(review.menuItemId)
          return (
            <Card key={review.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-text-main">{review.customerName}</p>
                  <p className="text-sm text-text-slate">{meal ? t(meal.name) : t(restaurant.name)} · {formatDateTime(review.createdAt)}</p>
                </div>
                <Rating value={review.rating} />
              </div>
              <p className="whitespace-pre-line text-sm leading-6 text-text-main">{review.comment || t('No written comment')}</p>
              {review.isReported ? (
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="neutral">{t('Reported to admin')}</StatusPill>
                  {review.reportReason && <span className="text-sm text-text-slate">{t('Reason')}: {review.reportReason}</span>}
                </div>
              ) : (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!review.comment}
                    onClick={() => {
                      setReviewToReport(review)
                      setReportReason('')
                    }}
                  >
                    {t('Report comment')}
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>
      <Modal
        open={reviewToReport !== null}
        onClose={() => setReviewToReport(null)}
        title={t('Report this comment')}
        size="md"
      >
        <div className="space-y-4">
          <p className="rounded-lg bg-surface-cream p-3 text-sm text-text-slate">{reviewToReport?.comment}</p>
          <label className="grid gap-2 text-sm font-semibold text-text-main">
            {t('Reason for report')}
            <textarea
              className="min-h-24 rounded-lg border border-border-subtle bg-surface-white px-3 py-2 font-normal text-text-main"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              maxLength={500}
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => setReviewToReport(null)}>{t('Cancel')}</Button>
            <Button
              variant="danger"
              loading={busy}
              disabled={!reportReason.trim()}
              onClick={() => void report()}
            >
              {t('Send to admin')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
