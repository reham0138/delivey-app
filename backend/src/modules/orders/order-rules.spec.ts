import { HttpStatus } from '@nestjs/common'
import { describe, expect, it } from '@jest/globals'
import { AppException } from '../../common/errors/app.exception'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import {
  applyStatusTransition,
  calculateOrderTotals,
  cancelOrder,
  roundMoney,
} from './order-rules'

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
          'pending',
          'preparing',
          [{ status: 'pending', at: '2026-01-01T00:00:00.000Z' }],
          '2026-01-01T00:05:00.000Z',
        ),
      ).toEqual({
        status: 'preparing',
        statusHistory: [
          { status: 'pending', at: '2026-01-01T00:00:00.000Z' },
          { status: 'preparing', at: '2026-01-01T00:05:00.000Z' },
        ],
        paymentStatus: undefined,
      })
    })

    it('rejects a skipped status', () => {
      expect(() =>
        applyStatusTransition('pending', 'ready', [], '2026-01-01T00:05:00.000Z'),
      ).toThrow(AppException)
      try {
        applyStatusTransition('pending', 'ready', [], '2026-01-01T00:05:00.000Z')
      } catch (error) {
        expect((error as AppException).code).toBe(ErrorCode.InvalidStatusTransition)
      }
    })

    it('marks a delivered cash order paid', () => {
      expect(
        applyStatusTransition(
          'on_the_way',
          'delivered',
          [],
          '2026-01-01T00:05:00.000Z',
          'cash',
          'pending',
        ).paymentStatus,
      ).toBe('paid')
    })
  })

  describe('cancellation', () => {
    it('allows customer cancellation only while pending or preparing', () => {
      expect(cancelOrder('pending', 'customer', [], '2026-01-01T00:05:00.000Z')).toMatchObject({
        status: 'cancelled',
        cancelledBy: 'customer',
        cancellationReason: null,
      })
      expect(() =>
        cancelOrder('ready', 'customer', [], '2026-01-01T00:05:00.000Z'),
      ).toThrow(AppException)
    })

    it('requires restaurant and admin cancellation reasons', () => {
      expect(() =>
        cancelOrder('preparing', 'restaurant', [], '2026-01-01T00:05:00.000Z', '   '),
      ).toThrow(AppException)

      expect(
        cancelOrder(
          'ready',
          'admin',
          [],
          '2026-01-01T00:05:00.000Z',
          '  Duplicate order  ',
        ).cancellationReason,
      ).toBe('Duplicate order')
    })

    it('does not allow cancellation of delivered or cancelled orders', () => {
      expect(() =>
        cancelOrder('delivered', 'admin', [], '2026-01-01T00:05:00.000Z', 'Reason'),
      ).toThrow(AppException)
      expect(() =>
        cancelOrder('cancelled', 'restaurant', [], '2026-01-01T00:05:00.000Z', 'Reason'),
      ).toThrow(AppException)
    })
  })
})
