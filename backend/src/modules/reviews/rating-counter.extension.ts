/**
 * Rating counter extension point for teammate-owned schemas.
 *
 * Mahdi's MenuItem and Restaurant models should expose:
 *   ratingSum: number (default 0, select false)
 *   ratingCount: number (default 0, select false)
 *
 * The reviews module will update both models atomically:
 * - Create: {$inc: {ratingSum: rating, ratingCount: 1}}
 * - Hide: {$inc: {ratingSum: -hiddenReview.rating, ratingCount: -1}}
 *
 * Reported reviews remain counted until an admin hides them.
 * Never increment counters in this module until the review is persisted.
 */
export interface RatingCounterExtension {
  ratingSum: number
  ratingCount: number
}
