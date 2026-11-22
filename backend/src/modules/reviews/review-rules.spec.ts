import { HttpStatus } from '@nestjs/common'
import { describe, expect, it } from '@jest/globals'
import { AppException } from '../../common/errors/app.exception'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import { assertReviewEligible, isReviewEligible } from './review-rules'

describe('review rules', () => {
  const order = {
    customerId: 'customer-1',
    status: 'delivered' as const,
    items: [{ menuItemId: 'meal-1' }, { menuItemId: 'meal-2' }],
  }

  it('allows a customer to review a meal in their delivered order', () => {
    expect(isReviewEligible(order, 'customer-1', 'meal-2')).toBe(true)
    expect(() => assertReviewEligible(order, 'customer-1', 'meal-2')).not.toThrow()
  })

  it('rejects an order that is not delivered', () => {
    const notDelivered = { ...order, status: 'ready' as const }

    expect(isReviewEligible(notDelivered, 'customer-1', 'meal-1')).toBe(false)
    expect(() => assertReviewEligible(notDelivered, 'customer-1', 'meal-1')).toThrow(
      AppException,
    )
  })

  it('rejects an order owned by another customer', () => {
    expect(isReviewEligible(order, 'customer-2', 'meal-1')).toBe(false)
  })

  it('rejects a meal that is not in the order', () => {
    expect(isReviewEligible(order, 'customer-1', 'meal-3')).toBe(false)
  })

  it('throws REVIEW_NOT_ELIGIBLE with the contract status', () => {
    try {
      assertReviewEligible(order, 'customer-2', 'meal-1')
    } catch (error) {
      expect(error).toBeInstanceOf(AppException)
      expect((error as AppException).getStatus()).toBe(HttpStatus.BAD_REQUEST)
      expect((error as AppException).code).toBe(ErrorCode.ReviewNotEligible)
    }
  })
})

