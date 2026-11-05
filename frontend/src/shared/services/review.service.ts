import type { Order, Review } from '@/shared/types'
const STORAGE_KEY = 'crown-anchor-reviews'
async function getAll(): Promise<Review[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as Review[]
  } catch { /* load the fixture if local storage is unavailable or malformed */ }
  const response = await fetch('/mock/reviews.json')
  if (!response.ok) throw new Error('Could not load reviews.')
  const reviews = await response.json() as Review[]
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews)) } catch { /* keep the current session usable */ }
  return reviews
}
export const reviewService = {
  async getCustomerMealReview(customerId: number, menuItemId: number): Promise<Review | null> {
    return (await getAll()).find(review => review.customerId === customerId && review.menuItemId === menuItemId) ?? null
  },
  async createReview(order: Order, customerName: string, menuItemId: number, rating: number, comment: string): Promise<Review> {
    if (order.status !== 'delivered' || order.items.every(item => item.menuItemId !== menuItemId)) throw new Error('Reviews are available only for meals in delivered orders.')
    const reviews = await getAll()
    if (reviews.some(review => review.customerId === order.customerId && review.menuItemId === menuItemId)) throw new Error('You have already reviewed this meal.')
    const review: Review = {
      id: Math.max(0, ...reviews.map(item => item.id)) + 1,
      menuItemId, restaurantId: order.restaurantId, customerId: order.customerId,
      customerName, orderId: order.id, rating, comment: comment.trim() || null,
      createdAt: new Date().toISOString(), updatedAt: null, isReported: false, reportReason: null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...reviews, review]))
    return review
  },
}
