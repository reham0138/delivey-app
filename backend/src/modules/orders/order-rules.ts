import { HttpStatus } from '@nestjs/common'
import { AppException } from '../../common/errors/app.exception'
import { ErrorCode } from '../../common/errors/error-codes.enum'

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled'

export type CancellationActor = 'customer' | 'restaurant' | 'admin'

export interface StatusHistoryEntry {
  status: OrderStatus
  at: string
}

export interface OrderTotalsInput {
  subtotal: number
  deliveryFee: number
  tip: number
  promoCode?: string | null
}

export interface OrderTotals {
  subtotal: number
  deliveryFee: number
  serviceFee: number
  tax: number
  discount: number
  tip: number
  total: number
}

export interface StatusTransitionResult {
  status: OrderStatus
  statusHistory: StatusHistoryEntry[]
  paymentStatus?: 'pending' | 'simulated' | 'paid'
}

export interface CancellationResult {
  status: 'cancelled'
  cancelledBy: CancellationActor
  cancellationReason: string | null
  statusHistory: StatusHistoryEntry[]
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = roundMoney(input.subtotal)
  let deliveryFee = roundMoney(input.deliveryFee)
  let discount = 0
  const tip = roundMoney(input.tip)
  const promoCode = input.promoCode?.trim().toUpperCase()

  if (promoCode) {
    if (promoCode === 'WELCOME10') {
      discount = roundMoney(subtotal * 0.1)
    } else if (promoCode === 'FREESHIP') {
      deliveryFee = 0
    } else {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.InvalidPromoCode,
        'Promo code is invalid',
      )
    }
  }

  const serviceFee = roundMoney(subtotal * 0.05)
  const tax = roundMoney(subtotal * 0.1)
  const total = roundMoney(subtotal + deliveryFee + serviceFee + tax - discount + tip)

  return {
    subtotal,
    deliveryFee,
    serviceFee,
    tax,
    discount,
    tip,
    total,
  }
}

export function getNextOrderStatus(status: OrderStatus): OrderStatus | null {
  const nextStatuses: Partial<Record<OrderStatus, OrderStatus>> = {
    pending: 'preparing',
    preparing: 'ready',
    ready: 'on_the_way',
    on_the_way: 'delivered',
  }
  return nextStatuses[status] ?? null
}

export function applyStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
  statusHistory: StatusHistoryEntry[],
  at: string,
  paymentMethod?: 'cash' | 'card',
  paymentStatus?: 'pending' | 'simulated' | 'paid',
): StatusTransitionResult {
  if (getNextOrderStatus(currentStatus) !== nextStatus) {
    throw new AppException(
      HttpStatus.CONFLICT,
      ErrorCode.InvalidStatusTransition,
      'Order status transition is not allowed',
    )
  }

  const updatedPaymentStatus =
    nextStatus === 'delivered' && paymentMethod === 'cash'
      ? 'paid'
      : paymentStatus

  return {
    status: nextStatus,
    statusHistory: [...statusHistory, { status: nextStatus, at }],
    paymentStatus: updatedPaymentStatus,
  }
}

export function canCancelOrder(status: OrderStatus, actor: CancellationActor): boolean {
  if (status === 'delivered' || status === 'cancelled') {
    return false
  }
  if (actor === 'admin') {
    return true
  }
  return status === 'pending' || status === 'preparing'
}

export function cancelOrder(
  currentStatus: OrderStatus,
  actor: CancellationActor,
  statusHistory: StatusHistoryEntry[],
  at: string,
  reason?: string | null,
): CancellationResult {
  if (!canCancelOrder(currentStatus, actor)) {
    throw new AppException(
      HttpStatus.CONFLICT,
      ErrorCode.OrderNotCancellable,
      'Order cannot be cancelled in its current status',
    )
  }

  const trimmedReason = reason?.trim() || null
  if (actor !== 'customer' && !trimmedReason) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.ValidationError,
      'Cancellation reason is required',
      [{ field: 'reason', message: 'must not be empty' }],
    )
  }

  return {
    status: 'cancelled',
    cancelledBy: actor,
    cancellationReason: trimmedReason,
    statusHistory: [...statusHistory, { status: 'cancelled', at }],
  }
}
