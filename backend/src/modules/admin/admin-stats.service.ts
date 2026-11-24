import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { OrderStatus } from '../../common/enums'
import { Order, OrderDocument } from '../orders/schemas/order.schema'
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema'
import { Review, ReviewDocument } from '../reviews/schemas/review.schema'
import { User, UserDocument } from '../users/schemas/user.schema'
import type { AdminStats } from './admin.types'

interface CountRow {
  _id: string
  count: number
}

interface DailyRow {
  _id: string // YYYY-MM-DD (UTC)
  orders: number
  revenue: number
}

interface TopRestaurantRow {
  _id: unknown // restaurant ObjectId
  name: string
  orders: number
  revenue: number
}

const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Restaurant.name) private readonly restaurantModel: Model<RestaurantDocument>,
  ) {}

  async getStats(today: Date = new Date()): Promise<AdminStats> {
    const windowStart = last14DaysWindowStart(today)
    const [
      totalOrders,
      ordersByStatusRows,
      revenueRows,
      usersByRoleRows,
      suspendedUsers,
      activeRestaurants,
      reportedReviews,
      dailyRows,
      topRows,
    ] = await Promise.all([
      this.orderModel.countDocuments({}),
      this.orderModel.aggregate<CountRow>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.orderModel.aggregate<{ total: number }>([
        { $match: { status: OrderStatus.Delivered } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.userModel.aggregate<CountRow>([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      this.userModel.countDocuments({ status: 'suspended' }),
      this.restaurantModel.countDocuments({ isActive: true }),
      this.reviewModel.countDocuments({ isReported: true, isHidden: { $ne: true } }),
      this.orderModel.aggregate<DailyRow>([
        { $match: { createdAt: { $gte: windowStart } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
            },
            orders: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [{ $eq: ['$status', OrderStatus.Delivered] }, '$total', 0],
              },
            },
          },
        },
      ]),
      this.topRestaurants(),
    ])

    return {
      totalOrders,
      ordersByStatus: toCountMap(ordersByStatusRows),
      totalRevenue: round2(revenueRows[0]?.total ?? 0),
      usersByRole: toCountMap(usersByRoleRows) as AdminStats['usersByRole'],
      suspendedUsers,
      activeRestaurants,
      reportedReviews,
      last14Days: buildLast14Days(dailyRows, today),
      topRestaurants: topRows.map((row) => ({
        restaurantId: String(row._id),
        name: row.name,
        orders: row.orders,
        revenue: round2(row.revenue),
      })),
    }
  }

  // Top 5 restaurants by delivered revenue; name joined from the restaurants
  // collection. Restaurants without delivered orders never appear.
  private topRestaurants() {
    return this.orderModel.aggregate<TopRestaurantRow>([
      { $match: { status: OrderStatus.Delivered } },
      {
        $group: {
          _id: '$restaurantId',
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      { $unwind: '$restaurant' },
      {
        $project: {
          _id: 1,
          name: '$restaurant.name',
          orders: 1,
          revenue: 1,
        },
      },
      { $sort: { revenue: -1, name: 1 } },
      { $limit: 5 },
    ])
  }
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function toCountMap(rows: CountRow[]): Partial<Record<string, number>> {
  const map: Record<string, number> = {}
  for (const row of rows) {
    if (row.count > 0 && row._id) map[row._id] = row.count
  }
  return map
}

// UTC midnight of the oldest day in the 14-day window ending at `today`.
export function last14DaysWindowStart(today: Date): Date {
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return new Date(todayUtc - 13 * DAY_MS)
}

// Fills exactly 14 entries (oldest first, ending today UTC); days without
// orders get zeros. `today` is injectable for tests.
export function buildLast14Days(dailyRows: DailyRow[], today: Date): AdminStats['last14Days'] {
  const byDate = new Map(dailyRows.map((row) => [row._id, row]))
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const series: AdminStats['last14Days'] = []
  for (let i = 13; i >= 0; i--) {
    const date = new Date(todayUtc - i * DAY_MS).toISOString().slice(0, 10)
    const row = byDate.get(date)
    series.push({
      date,
      orders: row?.orders ?? 0,
      revenue: round2(row?.revenue ?? 0),
    })
  }
  return series
}
