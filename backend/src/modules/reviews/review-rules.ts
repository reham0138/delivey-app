import { HttpStatus } from '@nestjs/common'
import { AppException } from '../../common/errors/app.exception'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import { OrderStatus } from '../../common/enums'

export interface ReviewEligibleOrder {
  customerId: string
  status: OrderStatus
  items: Array<{ menuItemId: string }>
}

export function isReviewEligible(
  order: ReviewEligibleOrder,
  customerId: string,
  menuItemId: string,
): boolean {
  return (
    order.status === OrderStatus.Delivered &&
    order.customerId === customerId &&
    order.items.some((item) => item.menuItemId === menuItemId)
  )
}

export function assertReviewEligible(
  order: ReviewEligibleOrder,
  customerId: string,
  menuItemId: string,
): void {
  if (!isReviewEligible(order, customerId, menuItemId)) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.ReviewNotEligible,
      'This order is not eligible for a review',
    )
  }
}
