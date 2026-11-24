import { OrderStatus, Role } from '../../common/enums'
import {
  AdminStatsService,
  buildLast14Days,
  last14DaysWindowStart,
  round2,
} from './admin-stats.service'

type Row = { _id: string; orders: number; revenue: number }

describe('round2', () => {
  it('rounds to 2 decimals', () => {
    expect(round2(10.005)).toBe(10.01)
    expect(round2(3.14159)).toBe(3.14)
    expect(round2(0)).toBe(0)
    expect(round2(7)).toBe(7)
  })
})

describe('last14DaysWindowStart', () => {
  it('returns UTC midnight 13 days before today', () => {
    const today = new Date('2024-06-15T15:30:00Z')
    expect(last14DaysWindowStart(today).toISOString()).toBe('2024-06-02T00:00:00.000Z')
  })
})

describe('buildLast14Days', () => {
  const today = new Date('2024-06-15T10:00:00Z') // UTC day 2024-06-15

  it('produces exactly 14 entries ending today, oldest first', () => {
    const series = buildLast14Days([], today)
    expect(series).toHaveLength(14)
    expect(series[0].date).toBe('2024-06-02')
    expect(series[13].date).toBe('2024-06-15')
    expect(series.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))).toBe(true)
    expect(series.every((d) => d.orders === 0 && d.revenue === 0)).toBe(true)
  })

  it('fills missing days with zeros and keeps order/revenue', () => {
    const rows: Row[] = [
      { _id: '2024-06-10', orders: 3, revenue: 42.5 },
      { _id: '2024-06-15', orders: 1, revenue: 10.126 },
      { _id: '2024-06-01', orders: 9, revenue: 99 }, // outside window — ignored
    ]
    const series = buildLast14Days(rows, today)
    const jun10 = series.find((d) => d.date === '2024-06-10')!
    const jun15 = series.find((d) => d.date === '2024-06-15')!
    const jun11 = series.find((d) => d.date === '2024-06-11')!
    expect(jun10).toEqual({ date: '2024-06-10', orders: 3, revenue: 42.5 })
    expect(jun15).toEqual({ date: '2024-06-15', orders: 1, revenue: 10.13 })
    expect(jun11).toEqual({ date: '2024-06-11', orders: 0, revenue: 0 })
    expect(series.reduce((s, d) => s + d.orders, 0)).toBe(4)
  })

  it('handles month boundaries', () => {
    const series = buildLast14Days([], new Date('2024-03-05T00:00:00Z'))
    expect(series[0].date).toBe('2024-02-21')
    expect(series[13].date).toBe('2024-03-05')
  })
})

describe('AdminStatsService.getStats mapping', () => {
  function setup(aggregates: Record<string, unknown>) {
    const orderModel = {
      countDocuments: jest.fn().mockResolvedValue((aggregates.totalOrders as number) ?? 0),
      aggregate: jest.fn((pipeline: unknown[]) => {
        const stage = JSON.stringify(pipeline)
        if (stage.includes('$dateToString')) return Promise.resolve(aggregates.daily ?? [])
        if (stage.includes('"$lookup"')) return Promise.resolve(aggregates.top ?? [])
        if (stage.includes('delivered')) {
          return Promise.resolve(aggregates.revenue ?? [])
        }
        return Promise.resolve(aggregates.ordersByStatus ?? [])
      }),
    }
    const userModel = {
      countDocuments: jest.fn().mockResolvedValue((aggregates.suspended as number) ?? 0),
      aggregate: jest.fn().mockResolvedValue(aggregates.usersByRole ?? []),
    }
    const reviewModel = {
      countDocuments: jest.fn().mockResolvedValue((aggregates.reported as number) ?? 0),
    }
    const restaurantModel = {
      countDocuments: jest.fn().mockResolvedValue((aggregates.activeR as number) ?? 0),
    }
    const service = new AdminStatsService(
      orderModel as never,
      userModel as never,
      reviewModel as never,
      restaurantModel as never,
    )
    return { service }
  }

  it('maps aggregation results to AdminStats shape', async () => {
    const { service } = setup({
      totalOrders: 37,
      ordersByStatus: [
        { _id: OrderStatus.Delivered, count: 20 },
        { _id: OrderStatus.Cancelled, count: 5 },
      ],
      revenue: [{ total: 1234.567 }],
      usersByRole: [
        { _id: Role.Customer, count: 12 },
        { _id: Role.Restaurant, count: 8 },
        { _id: Role.Admin, count: 1 },
      ],
      suspended: 2,
      activeR: 7,
      reported: 4,
      daily: [{ _id: '2024-06-14', orders: 2, revenue: 30.5 }],
      top: [
        { _id: { toString: () => '64b0000000000000000000aa' }, name: 'Burger Hub', orders: 9, revenue: 500.125 },
        { _id: { toString: () => '64b0000000000000000000bb' }, name: 'Pizza Place', orders: 4, revenue: 200 },
      ],
    })
    const stats = await service.getStats(new Date('2024-06-15T12:00:00Z'))
    expect(stats.totalOrders).toBe(37)
    expect(stats.ordersByStatus).toEqual({ delivered: 20, cancelled: 5 })
    expect(stats.totalRevenue).toBe(1234.57)
    expect(stats.usersByRole).toEqual({ customer: 12, restaurant: 8, admin: 1 })
    expect(stats.suspendedUsers).toBe(2)
    expect(stats.activeRestaurants).toBe(7)
    expect(stats.reportedReviews).toBe(4)
    expect(stats.last14Days).toHaveLength(14)
    expect(stats.last14Days[13].date).toBe('2024-06-15')
    expect(stats.topRestaurants).toEqual([
      { restaurantId: '64b0000000000000000000aa', name: 'Burger Hub', orders: 9, revenue: 500.13 },
      { restaurantId: '64b0000000000000000000bb', name: 'Pizza Place', orders: 4, revenue: 200 },
    ])
  })

  it('omits zero-count status keys and handles empty aggregates', async () => {
    const { service } = setup({
      ordersByStatus: [{ _id: OrderStatus.Pending, count: 0 }],
      revenue: [],
      daily: [],
      top: [],
    })
    const stats = await service.getStats(new Date('2024-06-15T00:00:00Z'))
    expect(stats.ordersByStatus).toEqual({})
    expect(stats.totalRevenue).toBe(0)
    expect(stats.last14Days.every((d) => d.orders === 0)).toBe(true)
    expect(stats.topRestaurants).toEqual([])
  })
})
