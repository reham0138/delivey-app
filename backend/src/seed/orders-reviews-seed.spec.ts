import { readFileSync } from 'fs'
import { resolve } from 'path'
import mongoose, { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { MenuItem } from '../modules/menu-items/schemas/menu-item.schema'
import { Order, OrderSchema } from '../modules/orders/schemas/order.schema'
import { Restaurant } from '../modules/restaurants/schemas/restaurant.schema'
import { Review, ReviewSchema } from '../modules/reviews/schemas/review.schema'
import { OrdersReviewsModels, seedOrdersReviews } from './orders-reviews-seed'

interface FixtureWithId {
  id: number
}

interface FixtureOrder extends FixtureWithId {
  customerId: number
  restaurantId: number
  items: { menuItemId: number }[]
  createdAt: string
}

interface FixtureReview extends FixtureWithId {
  menuItemId: number
  restaurantId: number
  customerId: number
  orderId: number
  rating: number
}

interface FixtureRestaurant extends FixtureWithId {
  deliveryTimeMinutes: number
}

function readFixture<T>(filename: string): T[] {
  return JSON.parse(
    readFileSync(resolve(__dirname, '../../../frontend/public/mock', filename), 'utf8'),
  ) as T[]
}

function fixtureIds(rows: FixtureWithId[]): Map<number, Types.ObjectId> {
  return new Map(rows.map((row) => [row.id, new Types.ObjectId()]))
}

function makeMaps() {
  return {
    users: fixtureIds(readFixture<FixtureWithId>('users.json')),
    restaurants: fixtureIds(readFixture<FixtureRestaurant>('restaurants.json')),
    menuItems: fixtureIds(readFixture<FixtureWithId>('menu-items.json')),
  }
}

function makeModels() {
  const ordersBulkWrite = jest.fn().mockResolvedValue({ upsertedCount: 0, modifiedCount: 0 })
  const reviewsBulkWrite = jest.fn().mockResolvedValue({ upsertedCount: 0, modifiedCount: 0 })
  const menuItemsBulkWrite = jest.fn().mockResolvedValue({ upsertedCount: 0, modifiedCount: 0 })
  const restaurantsBulkWrite = jest.fn().mockResolvedValue({ upsertedCount: 0, modifiedCount: 0 })
  const models: OrdersReviewsModels = {
    orders: { bulkWrite: ordersBulkWrite } as unknown as Model<Order>,
    reviews: { bulkWrite: reviewsBulkWrite } as unknown as Model<Review>,
    menuItems: { bulkWrite: menuItemsBulkWrite } as unknown as Model<MenuItem>,
    restaurants: { bulkWrite: restaurantsBulkWrite } as unknown as Model<Restaurant>,
  }
  return { models, ordersBulkWrite, reviewsBulkWrite, menuItemsBulkWrite, restaurantsBulkWrite }
}

describe('seedOrdersReviews', () => {
  it('shifts the newest order to yesterday and keeps ids stable across runs', async () => {
    const orders = readFixture<FixtureOrder>('orders.json')
    const { models, ordersBulkWrite } = makeModels()
    const maps = makeMaps()

    await seedOrdersReviews(models, maps)
    await seedOrdersReviews(models, maps)

    const operations = ordersBulkWrite.mock.calls[0][0] as Array<{
      replaceOne: { filter: { _id: Types.ObjectId }; replacement: Record<string, unknown> }
    }>
    expect(operations).toHaveLength(orders.length)

    const createdAts = operations.map((op) =>
      (op.replaceOne.replacement.createdAt as Date).getTime(),
    )
    const newest = Math.max(...createdAts)
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    expect(Math.abs(newest - dayAgo)).toBeLessThan(60 * 1000)

    // Same deterministic ids on the second run => replaceOne upserts, no duplicates.
    const secondRun = ordersBulkWrite.mock.calls[1][0] as typeof operations
    expect(secondRun.map((op) => String(op.replaceOne.filter._id))).toEqual(
      operations.map((op) => String(op.replaceOne.filter._id)),
    )
  })

  it('computes rating counters from the reviews and writes them to both collections', async () => {
    const reviews = readFixture<FixtureReview>('reviews.json')
    const maps = makeMaps()
    const { models, menuItemsBulkWrite, restaurantsBulkWrite } = makeModels()

    await seedOrdersReviews(models, maps)

    const menuItemOps = menuItemsBulkWrite.mock.calls[0][0] as Array<{
      updateOne: { filter: { _id: Types.ObjectId }; update: { $set: Record<string, number> } }
    }>
    const firstMenuItemId = maps.menuItems.get(1) as Types.ObjectId
    const itemReviews = reviews.filter((review) => review.menuItemId === 1)
    const itemOp = menuItemOps.find((op) => op.updateOne.filter._id.equals(firstMenuItemId))
    expect(itemOp?.updateOne.update.$set).toEqual({
      ratingSum: itemReviews.reduce((sum, review) => sum + review.rating, 0),
      ratingCount: itemReviews.length,
    })

    const restaurantOps = restaurantsBulkWrite.mock.calls[0][0] as typeof menuItemOps
    const firstRestaurantId = maps.restaurants.get(1) as Types.ObjectId
    const restaurantReviews = reviews.filter((review) => review.restaurantId === 1)
    const restaurantOp = restaurantOps.find((op) =>
      op.updateOne.filter._id.equals(firstRestaurantId),
    )
    expect(restaurantOp?.updateOne.update.$set).toEqual({
      ratingSum: restaurantReviews.reduce((sum, review) => sum + review.rating, 0),
      ratingCount: restaurantReviews.length,
    })
  })

  it('rejects an incomplete id map before writing any collection', async () => {
    const { models, ordersBulkWrite, reviewsBulkWrite } = makeModels()
    const maps = makeMaps()
    maps.users.delete(13)

    await expect(seedOrdersReviews(models, maps)).rejects.toThrow('Missing mapped ObjectIds')
    expect(ordersBulkWrite).not.toHaveBeenCalled()
    expect(reviewsBulkWrite).not.toHaveBeenCalled()
  })

  it('produces order and review documents that pass schema validation', async () => {
    const orders = readFixture<FixtureOrder>('orders.json')
    const reviews = readFixture<FixtureReview>('reviews.json')
    const maps = makeMaps()
    const { models, ordersBulkWrite, reviewsBulkWrite } = makeModels()

    await seedOrdersReviews(models, maps)

    const OrderModel = mongoose.model('OrdersReviewsSeedOrder', OrderSchema)
    const ReviewModel = mongoose.model('OrdersReviewsSeedReview', ReviewSchema)
    const orderOps = ordersBulkWrite.mock.calls[0][0] as Array<{
      replaceOne: { replacement: Record<string, unknown> }
    }>
    const reviewOps = reviewsBulkWrite.mock.calls[0][0] as Array<{
      replaceOne: { replacement: Record<string, unknown> }
    }>
    expect(orderOps).toHaveLength(orders.length)
    expect(reviewOps).toHaveLength(reviews.length)
    for (const op of orderOps) {
      expect(new OrderModel(op.replaceOne.replacement).validateSync()).toBeUndefined()
    }
    for (const op of reviewOps) {
      expect(new ReviewModel(op.replaceOne.replacement).validateSync()).toBeUndefined()
    }
  })
})
