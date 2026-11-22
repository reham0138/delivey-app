import 'reflect-metadata'
import { Types } from 'mongoose'
import { describe, expect, it, jest } from '@jest/globals'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import { Role } from '../../common/enums'
import { ReviewsService } from './reviews.service'

describe('ReviewsService', () => {
  const customerId = new Types.ObjectId()
  const orderId = new Types.ObjectId()
  const menuItemId = new Types.ObjectId()
  const restaurantId = new Types.ObjectId()

  const user = {
    id: String(customerId),
    role: Role.Customer,
    name: 'Mahdi',
    email: 'mahdi@example.com',
  }

  function makeReview(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      customerId,
      customerName: 'Mahdi',
      orderId,
      menuItemId,
      restaurantId,
      rating: 5,
      comment: 'Great meal',
      isReported: false,
      reportReason: null,
      isHidden: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
      save: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      ...overrides,
    }
  }

  it('creates a review after eligibility checks and atomically increments both counters', async () => {
    const review = makeReview()
    const order = {
      _id: orderId,
      customerId,
      restaurantId,
      status: 'delivered',
      items: [{ menuItemId, quantity: 1, name: 'Burger', unitPrice: 12 }],
    }
    const menuItem = {
      _id: menuItemId,
      restaurantId,
      isActive: true,
    }

    const reviewModel = {
      findOne: jest.fn<() => Promise<null>>().mockResolvedValue(null),
      create: jest.fn<() => Promise<typeof review>>().mockResolvedValue(review),
    }
    const orderModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn<() => Promise<typeof order>>().mockResolvedValue(order),
      }),
    }
    const menuItemModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn<() => Promise<typeof menuItem>>().mockResolvedValue(menuItem),
      }),
      updateOne: jest.fn<() => Promise<{ modifiedCount: number }>>().mockResolvedValue({
        modifiedCount: 1,
      }),
    }
    const restaurantModel = {
      updateOne: jest.fn<() => Promise<{ modifiedCount: number }>>().mockResolvedValue({
        modifiedCount: 1,
      }),
    }
    const service = new ReviewsService(
      reviewModel as never,
      orderModel as never,
      menuItemModel as never,
      restaurantModel as never,
    )

    const result = await service.create(user, {
      orderId: String(orderId),
      menuItemId: String(menuItemId),
      rating: 5,
      comment: '  Great meal  ',
    })

    expect(result.comment).toBe('Great meal')
    expect(menuItemModel.updateOne).toHaveBeenCalledWith(
      { _id: menuItemId, isActive: true },
      { $inc: { ratingSum: 5, ratingCount: 1 } },
    )
    expect(restaurantModel.updateOne).toHaveBeenCalledWith(
      { _id: restaurantId },
      { $inc: { ratingSum: 5, ratingCount: 1 } },
    )
  })

  it('rejects ineligible orders and duplicate customer-menu-item reviews', async () => {
    const order = {
      _id: orderId,
      customerId,
      restaurantId,
      status: 'ready',
      items: [{ menuItemId, quantity: 1 }],
    }
    const menuItem = { _id: menuItemId, restaurantId, isActive: true }
    const orderModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn<() => Promise<typeof order>>().mockResolvedValue(order),
      }),
    }
    const menuItemModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn<() => Promise<typeof menuItem>>().mockResolvedValue(menuItem),
      }),
    }
    const service = new ReviewsService(
      { findOne: jest.fn<() => Promise<null>>().mockResolvedValue(null) } as never,
      orderModel as never,
      menuItemModel as never,
      {} as never,
    )

    await expect(
      service.create(user, {
        orderId: String(orderId),
        menuItemId: String(menuItemId),
        rating: 4,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.ReviewNotEligible })

    const duplicateOrder = { ...order, status: 'delivered' }
    orderModel.findOne.mockReturnValue({
      exec: jest.fn<() => Promise<typeof duplicateOrder>>().mockResolvedValue(duplicateOrder),
    })
    const duplicateService = new ReviewsService(
      { findOne: jest.fn<() => Promise<typeof reviewFixture>>().mockResolvedValue(reviewFixture) } as never,
      orderModel as never,
      menuItemModel as never,
      {} as never,
    )
    await expect(
      duplicateService.create(user, {
        orderId: String(orderId),
        menuItemId: String(menuItemId),
        rating: 4,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.ReviewAlreadyExists })
  })

  it('public listings exclude reported and hidden reviews', async () => {
    const reviewModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn<() => Promise<never[]>>().mockResolvedValue([]),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      }),
    }
    const service = new ReviewsService(reviewModel as never, {} as never, {} as never, {} as never)

    await service.findPublicForMenuItem(String(menuItemId), {
      page: 1,
      limit: 10,
    })

    expect(reviewModel.find).toHaveBeenCalledWith({
      menuItemId,
      isHidden: false,
      isReported: false,
    })
  })

  it('hides a review only once and decrements both counters once', async () => {
    const review = makeReview()
    const hiddenReview = makeReview({ _id: review._id, isHidden: true })
    const reviewModel = {
      findOneAndUpdate: jest
        .fn<() => Promise<typeof hiddenReview>>()
        .mockResolvedValueOnce(hiddenReview)
        .mockResolvedValueOnce(null as never),
      findById: jest.fn<() => Promise<typeof hiddenReview>>().mockResolvedValue(hiddenReview),
    }
    const menuItemModel = {
      updateOne: jest.fn<() => Promise<{ modifiedCount: number }>>().mockResolvedValue({
        modifiedCount: 1,
      }),
    }
    const restaurantModel = {
      updateOne: jest.fn<() => Promise<{ modifiedCount: number }>>().mockResolvedValue({
        modifiedCount: 1,
      }),
    }
    const service = new ReviewsService(
      reviewModel as never,
      {} as never,
      menuItemModel as never,
      restaurantModel as never,
    )

    const first = await service.hideForAdmin(String(review._id))
    expect(first).toMatchObject({ id: String(review._id), isHidden: true })
    expect(menuItemModel.updateOne).toHaveBeenCalledTimes(1)
    expect(restaurantModel.updateOne).toHaveBeenCalledTimes(1)

    const second = await service.hideForAdmin(String(review._id))
    expect(second).toMatchObject({ id: String(review._id), isHidden: true })
    expect(menuItemModel.updateOne).toHaveBeenCalledTimes(1)
  })

  it('dismisses a report without changing counters', async () => {
    const review = makeReview({ isReported: true, reportReason: 'Spam' })
    const reviewModel = {
      findOneAndUpdate: jest
        .fn<() => Promise<typeof review>>()
        .mockResolvedValue({ ...review, isReported: false, reportReason: null }),
    }
    const service = new ReviewsService(reviewModel as never, {} as never, {} as never, {} as never)
    const result = await service.dismissReport(String(review._id))
    expect(result.isReported).toBe(false)
    expect(result.reportReason).toBeNull()
  })
})

const reviewFixture = {
  _id: new Types.ObjectId(),
  rating: 4,
  isHidden: false,
}
