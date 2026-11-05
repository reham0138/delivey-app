import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/shared/components/Button'
import { reviewService } from '@/shared/services/review.service'
import type { Order, Review } from '@/shared/types'
export default function MealReviewForm({ order, menuItemId, customerName }: { order: Order; menuItemId: number; customerName: string }) {
  const [review,setReview] = useState<Review | null>(null)
  const [rating,setRating] = useState(5)
  const [comment,setComment] = useState('')
  const [loading,setLoading] = useState(true)
  const [submitting,setSubmitting] = useState(false)
  const [error,setError] = useState('')
  useEffect(() => {
    let active = true
    reviewService.getCustomerMealReview(order.customerId,menuItemId).then(value => { if(active) setReview(value) }).catch(reason => { if(active) setError(reason instanceof Error ? reason.message : 'Could not load your review.') }).finally(() => { if(active) setLoading(false) })
    return () => { active = false }
  },[order.customerId,menuItemId])
  const submit = async () => {
    setSubmitting(true); setError('')
    try { setReview(await reviewService.createReview(order,customerName,menuItemId,rating,comment)) }
    catch(reason) { setError(reason instanceof Error ? reason.message : 'Could not save your review.') }
    finally { setSubmitting(false) }
  }
  if (loading) return <p className="text-xs text-text-slate">Checking your review...</p>
  if (review) return <div className="rounded-lg bg-surface-cream p-3"><p className="text-xs font-semibold">Your review</p><p className="mt-1 text-sm text-brand-red" aria-label={`Rated ${review.rating} out of 5`}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</p>{review.comment && <p className="mt-1 text-sm text-text-slate">{review.comment}</p>}</div>
  return <div className="rounded-lg border border-border-subtle p-3"><p className="text-sm font-semibold">Rate this meal</p><div className="my-2 flex gap-1" role="group" aria-label="Meal rating">{[1,2,3,4,5].map(value => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} stars`} aria-pressed={rating === value} className="rounded p-1 text-brand-yellow focus-visible:outline-offset-2"><Star size={20} fill={value <= rating ? 'currentColor' : 'none'}/></button>)}</div><label className="sr-only" htmlFor={`review-${menuItemId}`}>Review comment</label><textarea id={`review-${menuItemId}`} value={comment} onChange={event => setComment(event.target.value)} rows={2} maxLength={500} placeholder="Share a few words (optional)" className="w-full rounded-lg border border-border-subtle bg-surface-white p-2 text-sm text-text-main"/>{error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}<Button size="sm" className="mt-2" loading={submitting} onClick={() => void submit()}>Submit review</Button></div>
}
