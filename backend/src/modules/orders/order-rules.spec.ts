import { HttpStatus } from '@nestjs/common'
import { describe, expect, it } from '@jest/globals'
import { CancellationActor, OrderStatus, PaymentMethod, PaymentStatus } from '../../common/enums'
import { AppException } from '../../common/errors/app.exception'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import { applyStatusTransition, calculateOrderTotals, cancelOrder, roundMoney } from './order-rules'

describe('order rules', () => {
  describe('calculateOrderTotals', () => {
    it('calculates fees and rounds every amount to two decimals', () => {
      expect(
        calculateOrderTotals({
          subtotal: 33.33,
          deliveryFee: 4.99,
          tip: 2.345,
          promoCode: null,
        }),
      ).toEqual({
        subtotal: 33.33,
        deliveryFee: 4.99,
        serviceFee: 1.67,
        tax: 3.33,
        discount: 0,
        tip: 2.35,
        total: 45.67,
      })
    })

    it('applies WELCOME10', () => {
      expect(
        calculateOrderTotals({
          subtotal: 100,
          deliveryFee: 5,
          tip: 10,
          promoCode: 'welcome10',
        }).discount,
      ).toBe(10)
    })

    it('applies FREESHIP', () => {
      expect(
        calculateOrderTotals({
          subtotal: 100,
          deliveryFee: 5,
          tip: 0,
          promoCode: 'FREESHIP',
        }).deliveryFee,
      ).toBe(0)
    })

    it('rejects an unknown promo code', () => {
      expect(() =>
        calculateOrderTotals({
          subtotal: 100,
          deliveryFee: 5,
          tip: 0,
          promoCode: 'NOPE',
        }),
      ).toThrow(AppException)

      try {
        calculateOrderTotals({ subtotal: 100, deliveryFee: 5, tip: 0, promoCode: 'NOPE' })
      } catch (error) {
        expect(error).toBeInstanceOf(AppException)
        expect((error as AppException).getStatus()).toBe(HttpStatus.BAD_REQUEST)
        expect((error as AppException).code).toBe(ErrorCode.InvalidPromoCode)
      }
    })

    it('rounds a two-decimal money value', () => {
      expect(roundMoney(10.005)).toBe(10.01)
    })
  })

  describe('status transitions', () => {
    it('moves one step forward and appends history', () => {
      expect(
        applyStatusTransition(
          OrderStatus.Pending,
          OrderStatus.Preparing,
          [{ status: OrderStatus.Pending, at: '2026-01-01T00:00:00.000Z' }],
          '2026-01-01T00:05:00.000Z',
        ),
      ).toEqual({
        status: OrderStatus.Preparing,
        statusHistory: [
          { status: OrderStatus.Pending, at: '2026-01-01T00:00:00.000Z' },
          { status: OrderStatus.Preparing, at: '2026-01-01T00:05:00.000Z' },
        ],
        paymentStatus: undefined,
      })
    })

    it('rejects a skipped status', () => {
      expect(() =>
        applyStatusTransition(
          OrderStatus.Pending,
          OrderStatus.Ready,
          [],
          '2026-01-01T00:05:00.000Z',
        ),
      ).toThrow(AppException)
      try {
        applyStatusTransition(
          OrderStatus.Pending,
          OrderStatus.Ready,
          [],
          '2026-01-01T00:05:00.000Z',
        )
      } catch (error) {
        expect((error as AppException).code).toBe(ErrorCode.InvalidStatusTransition)
      }
    })

    it('marks a delivered cash order paid', () => {
      expect(
        applyStatusTransition(
          OrderStatus.OnTheWay,
          OrderStatus.Delivered,
          [],
          '2026-01-01T00:05:00.000Z',
          PaymentMethod.Cash,
          PaymentStatus.Pending,
        ).paymentStatus,
      ).toBe(PaymentStatus.Paid)
    })
  })

  describe('cancellation', () => {
    it('allows customer cancellation only while pending or preparing', () => {
      expect(
        cancelOrder(
          OrderStatus.Pending,
          CancellationActor.Customer,
          [],
          '2026-01-01T00:05:00.000Z',
        ),
      ).toMatchObject({
        status: OrderStatus.Cancelled,
        cancelledBy: CancellationActor.Customer,
        cancellationReason: null,
      })
      expect(() =>
        cancelOrder(OrderStatus.Ready, CancellationActor.Customer, [], '2026-01-01T00:05:00.000Z'),
      ).toThrow(AppException)
    })

    it('requires restaurant and admin cancellation reasons', () => {
      expect(() =>
        cancelOrder(
          OrderStatus.Preparing,
          CancellationActor.Restaurant,
          [],
          '2026-01-01T00:05:00.000Z',
          '   ',
        ),
      ).toThrow(AppException)

      expect(
        cancelOrder(
          OrderStatus.Ready,
          CancellationActor.Admin,
          [],
          '2026-01-01T00:05:00.000Z',
          '  Duplicate order  ',
        ).cancellationReason,
      ).toBe('Duplicate order')
    })

    it('does not allow cancellation of delivered or cancelled orders', () => {
      expect(() =>
        cancelOrder(
          OrderStatus.Delivered,
          CancellationActor.Admin,
          [],
          '2026-01-01T00:05:00.000Z',
          'Reason',
        ),
      ).toThrow(AppException)
      expect(() =>
        cancelOrder(
          OrderStatus.Cancelled,
          CancellationActor.Restaurant,
          [],
          '2026-01-01T00:05:00.000Z',
          'Reason',
        ),
      ).toThrow(AppException)
    })
  })
})
