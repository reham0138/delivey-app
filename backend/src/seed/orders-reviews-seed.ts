import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createHash } from 'crypto'
import { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { CancellationActor, OrderStatus, PaymentMethod, PaymentStatus } from '../common/enums'
import { MenuItem } from '../modules/menu-items/schemas/menu-item.schema'
import { Order } from '../modules/orders/schemas/order.schema'
import { calculateOrderTotals, roundMoney } from '../modules/orders/order-rules'
import { Restaurant } from '../modules/restaurants/schemas/restaurant.schema'
import { Review } from '../modules/reviews/schemas/review.schema'

interface FixtureOrderItem {
  menuItemId: number
  name: string
  quantity: number
  unitPrice: number
}

interface FixtureOrder {
  id: number
  customerId: number
  customerName: string
  phone: string
  restaurantId: number
  status: Order['status']
  items: FixtureOrderItem[]
  subtotal: number
  deliveryFee: number
  deliveryAddress: string
  paymentMethod: PaymentMethod
  notes: string | null
  createdAt: string
  statusHistory: { status: Order['status']; at: string }[]
  cancelledBy: CancellationActor | null
  cancellationReason: string | null
}

interface FixtureReview {
  id: number
  menuItemId: number
  restaurantId: number
  customerId: number
  customerName: string
  orderId: number
  rating: number
  comment: string | null
  createdAt: string
  isReported: boolean
  reportReason: string | null
  isHidden?: boolean
}

interface FixtureRestaurantDelivery {
  id: number
  deliveryTimeMinutes: number
}

export interface OrdersReviewsIdMaps {
  users: ReadonlyMap<number, Types.ObjectId>
  restaurants: ReadonlyMap<number, Types.ObjectId>
  menuItems: ReadonlyMap<number, Types.ObjectId>
}

export interface OrdersReviewsSeedResult {
  ids: {
    orders: ReadonlyMap<number, Types.ObjectId>
    reviews: ReadonlyMap<number, Types.ObjectId>
  }
  created: {
    orders: number
    reviews: number
    ratingCounters: number
  }
}

export interface OrdersReviewsModels {
  orders: Model<Order>
  reviews: Model<Review>
  menuItems: Model<MenuItem>
  restaurants: Model<Restaurant>
}

interface RatingTotals {
  ratingSum: number
  ratingCount: number
}

function readFixture<T>(filename: string): T[] {
  const fixturePath = resolve(__dirname, '../../../frontend/public/mock', filename)
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T[]
}

function mappedId(
  ids: ReadonlyMap<number, Types.ObjectId>,
  fixtureId: number,
  entity: string,
): Types.ObjectId {
  const id = ids.get(fixtureId)
  if (!id) throw new Error(`Missing mapped ObjectId for ${entity} fixture ${fixtureId}`)
  return id
}

// Deterministic ObjectIds: sha256 of `crown-anchor-orders:<collection>:<fixtureId>`.
// Because the id is derived from the fixture id instead of being random, re-running
// the seed targets the same documents, so the replaceOne upserts make it idempotent.
function fixtureIds(rows: { id: number }[], collection: string): Map<number, Types.ObjectId> {
  return new Map(
    rows.map(({ id }) => [
      id,
      new Types.ObjectId(
        createHash('sha256')
          .update(`crown-anchor-orders:${collection}:${id}`)
          .digest('hex')
          .slice(0, 24),
      ),
    ]),
  )
}

function addRating(totals: Map<number, RatingTotals>, fixtureId: number, rating: number): void {
  const existing = totals.get(fixtureId) ?? { ratingSum: 0, ratingCount: 0 }
  existing.ratingSum += rating
  existing.ratingCount += 1
  totals.set(fixtureId, existing)
}

function getRating(totals: Map<number, RatingTotals>, fixtureId: number): RatingTotals {
  return totals.get(fixtureId) ?? { ratingSum: 0, ratingCount: 0 }
}

// The newest fixture order is shifted to yesterday so the 14-day stats chart
// is not empty (contract section 10). The same delta is applied to every order
// and review timestamp.
function dateShift(orders: { createdAt: string }[]): (iso: string) => Date {
  const newest = Math.max(...orders.map((order) => Date.parse(order.createdAt)))
  const delta = Date.now() - 24 * 60 * 60 * 1000 - newest
  return (iso: string) => new Date(Date.parse(iso) + delta)
}

function paymentStatusFor(order: FixtureOrder): PaymentStatus {
  if (order.paymentMethod === PaymentMethod.Card) return PaymentStatus.Simulated
  return order.status === OrderStatus.Delivered ? PaymentStatus.Paid : PaymentStatus.Pending
}

function assertMapsCoverFixtures(
  orders: FixtureOrder[],
  reviews: FixtureReview[],
  maps: OrdersReviewsIdMaps,
): void {
  const missing: string[] = []
  const check = (entity: string, map: ReadonlyMap<number, Types.ObjectId>, ids: number[]) => {
    for (const id of new Set(ids)) {
      if (!map.has(id)) missing.push(`${entity} fixture ${id}`)
    }
  }
  check('user', maps.users, [
    ...orders.map((order) => order.customerId),
    ...reviews.map((review) => review.customerId),
  ])
  check('restaurant', maps.restaurants, [
    ...orders.map((order) => order.restaurantId),
    ...reviews.map((review) => review.restaurantId),
  ])
  check('menu item', maps.menuItems, [
    ...orders.flatMap((order) => order.items.map((item) => item.menuItemId)),
    ...reviews.map((review) => review.menuItemId),
  ])
  if (missing.length > 0) {
    throw new Error(`Missing mapped ObjectIds for: ${missing.join(', ')}`)
  }
}

export async function seedOrdersReviews(
  models: OrdersReviewsModels,
  maps: OrdersReviewsIdMaps,
): Promise<OrdersReviewsSeedResult> {
  const orders = readFixture<FixtureOrder>('orders.json')
  const reviews = readFixture<FixtureReview>('reviews.json')
  const restaurants = readFixture<FixtureRestaurantDelivery>('restaurants.json')

  assertMapsCoverFixtures(orders, reviews, maps)

  const orderIds = fixtureIds(orders, 'order')
  const reviewIds = fixtureIds(reviews, 'review')
  const shift = dateShift(orders)
  const deliveryMinutesByRestaurant = new Map(
    restaurants.map((restaurant) => [restaurant.id, restaurant.deliveryTimeMinutes]),
  )

  const orderResult = await models.orders.bulkWrite(
    orders.map((order) => {
      const _id = orderIds.get(order.id) as Types.ObjectId
      const createdAt = shift(order.createdAt)
      const deliveryTimeMinutes = deliveryMinutesByRestaurant.get(order.restaurantId)
      if (deliveryTimeMinutes === undefined) {
        throw new Error(`Missing deliveryTimeMinutes for restaurant fixture ${order.restaurantId}`)
      }
      const totals = calculateOrderTotals({
        subtotal: roundMoney(order.subtotal),
        deliveryFee: roundMoney(order.deliveryFee),
        tip: 0,
      })
      return {
        replaceOne: {
          filter: { _id },
          replacement: {
            _id,
            customerId: mappedId(maps.users, order.customerId, 'user'),
            customerName: order.customerName,
            phone: order.phone,
            restaurantId: mappedId(maps.restaurants, order.restaurantId, 'restaurant'),
            status: order.status,
            items: order.items.map((item) => ({
              menuItemId: mappedId(maps.menuItems, item.menuItemId, 'menu item'),
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
            ...totals,
            deliveryAddress: order.deliveryAddress,
            paymentMethod: order.paymentMethod,
            paymentStatus: paymentStatusFor(order),
            notes: order.notes ?? null,
            promoCode: null,
            scheduledFor: null,
            estimatedDeliveryAt: new Date(createdAt.getTime() + deliveryTimeMinutes * 60 * 1000),
            statusHistory: order.statusHistory.map((entry) => ({
              status: entry.status,
              at: shift(entry.at),
            })),
            cancelledBy: order.cancelledBy ?? null,
            cancellationReason: order.cancellationReason ?? null,
            createdAt,
          },
          upsert: true,
        },
      }
    }),
    { ordered: true },
  )

  const reviewResult = await models.reviews.bulkWrite(
    reviews.map((review) => {
      const _id = reviewIds.get(review.id)
      const orderId = orderIds.get(review.orderId)
      if (!_id || !orderId) {
        throw new Error(`Missing mapped ObjectId for review fixture ${review.id}`)
      }
      return {
        replaceOne: {
          filter: { _id },
          replacement: {
            _id,
            menuItemId: mappedId(maps.menuItems, review.menuItemId, 'menu item'),
            restaurantId: mappedId(maps.restaurants, review.restaurantId, 'restaurant'),
            customerId: mappedId(maps.users, review.customerId, 'user'),
            orderId,
            customerName: review.customerName,
            rating: review.rating,
            comment: review.comment?.trim() || null,
            isReported: review.isReported ?? false,
            reportReason: review.reportReason ?? null,
            isHidden: review.isHidden ?? false,
            createdAt: shift(review.createdAt),
          },
          upsert: true,
        },
      }
    }),
    { ordered: true },
  )

  // Rating counters are computed from the seeded reviews, not copied from
  // fixture numbers (contract section 10). Hidden reviews do not count.
  const menuItemRatings = new Map<number, RatingTotals>()
  const restaurantRatings = new Map<number, RatingTotals>()
  for (const review of reviews) {
    if (review.isHidden) continue
    addRating(menuItemRatings, review.menuItemId, review.rating)
    addRating(restaurantRatings, review.restaurantId, review.rating)
  }

  const menuItemCounterResult = await models.menuItems.bulkWrite(
    [...maps.menuItems.entries()].map(([fixtureId, _id]) => ({
      updateOne: {
        filter: { _id },
        update: { $set: getRating(menuItemRatings, fixtureId) },
      },
    })),
    { ordered: true },
  )
  const restaurantCounterResult = await models.restaurants.bulkWrite(
    [...maps.restaurants.entries()].map(([fixtureId, _id]) => ({
      updateOne: {
        filter: { _id },
        update: { $set: getRating(restaurantRatings, fixtureId) },
      },
    })),
    { ordered: true },
  )

  return {
    ids: { orders: orderIds, reviews: reviewIds },
    created: {
      orders: orderResult.upsertedCount,
      reviews: reviewResult.upsertedCount,
      ratingCounters: menuItemCounterResult.modifiedCount + restaurantCounterResult.modifiedCount,
    },
  }
}
