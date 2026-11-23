import { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { User } from '../modules/users/schemas/user.schema'
import { MasterSeedError, runMasterSeed } from './seed-all'
import type { MasterSeedDeps } from './seed-all'

function oid(seed: number): Types.ObjectId {
  return new Types.ObjectId(seed.toString(16).padStart(24, '0'))
}

const USERS_IDS = new Map<number, Types.ObjectId>(
  Array.from({ length: 21 }, (_, i) => [i + 1, oid(i + 1)]),
)
const CATALOG_IDS = {
  categories: new Map<number, Types.ObjectId>([[1, oid(101)]]),
  restaurants: new Map<number, Types.ObjectId>([[3, oid(103)]]),
  menuItems: new Map<number, Types.ObjectId>([[5, oid(105)]]),
}

function buildDeps(): {
  deps: MasterSeedDeps
  calls: string[]
  mocks: {
    usersSeed: jest.Mock
    catalogSeed: jest.Mock
    ordersReviewsSeed: jest.Mock
    reconcile: jest.Mock
  }
} {
  const calls: string[] = []
  const mocks = {
    usersSeed: jest.fn(async () => {
      calls.push('users')
      return { ids: USERS_IDS, created: 21, existing: 0, skipped: 2, adminCreated: true }
    }),
    catalogSeed: jest.fn(async () => {
      calls.push('catalog')
      return {
        ids: CATALOG_IDS,
        created: { categories: 18, restaurants: 10, menuItems: 46 },
      }
    }),
    ordersReviewsSeed: jest.fn(async () => {
      calls.push('orders/reviews')
      return {
        ids: { orders: new Map(), reviews: new Map() },
        created: { orders: 37, reviews: 25, ratingCounters: 56 },
      }
    }),
    reconcile: jest.fn(async () => {
      calls.push('reconcile')
      return { changed: 0 }
    }),
  }

  const deps: MasterSeedDeps = {
    users: {} as Model<User>,
    catalog: {} as MasterSeedDeps['catalog'],
    ordersReviews: {} as MasterSeedDeps['ordersReviews'],
    seeds: {
      users: mocks.usersSeed,
      catalog: mocks.catalogSeed,
      ordersReviews: mocks.ordersReviewsSeed,
    },
    reconcile: mocks.reconcile,
    log: () => undefined,
  }
  return { deps, calls, mocks }
}

describe('runMasterSeed', () => {
  it('runs steps in order: users -> catalog -> orders/reviews -> reconcile', async () => {
    const { deps, calls } = buildDeps()
    const summary = await runMasterSeed(deps)
    expect(calls).toEqual(['users', 'catalog', 'orders/reviews', 'reconcile'])
    expect(summary.steps.map((s) => s.step)).toEqual([
      'users',
      'catalog',
      'orders/reviews',
      'reconcile',
    ])
  })

  it('passes the exact id maps to each step', async () => {
    const { deps, mocks } = buildDeps()
    await runMasterSeed(deps)

    expect(mocks.usersSeed).toHaveBeenCalledWith({ users: deps.users })
    expect(mocks.catalogSeed).toHaveBeenCalledWith(deps.catalog, USERS_IDS)

    const orArgs = mocks.ordersReviewsSeed.mock.calls[0][1] as {
      users: Map<number, Types.ObjectId>
      restaurants: Map<number, Types.ObjectId>
      menuItems: Map<number, Types.ObjectId>
    }
    expect(orArgs.users).toBe(USERS_IDS)
    expect(orArgs.restaurants).toBe(CATALOG_IDS.restaurants)
    expect(orArgs.menuItems).toBe(CATALOG_IDS.menuItems)
  })

  it('stops at the first failing step and reports completed work', async () => {
    const { deps, mocks } = buildDeps()
    mocks.catalogSeed.mockRejectedValue(new Error('boom in catalog'))

    const error = await runMasterSeed(deps).catch((e) => e)
    expect(error).toBeInstanceOf(MasterSeedError)
    expect(error.step).toBe('catalog')
    expect(error.message).toContain('boom in catalog')
    expect(error.completed.map((s: { step: string }) => s.step)).toEqual(['users'])
    expect(mocks.ordersReviewsSeed).not.toHaveBeenCalled()
    expect(mocks.reconcile).not.toHaveBeenCalled()
  })

  it('fails when the users id map is incomplete', async () => {
    const { deps, mocks } = buildDeps()
    mocks.usersSeed.mockResolvedValue({
      ids: new Map([[1, oid(1)]]),
      created: 1,
      existing: 0,
      skipped: 0,
      adminCreated: false,
    })

    const error = await runMasterSeed(deps).catch((e) => e)
    expect(error).toBeInstanceOf(MasterSeedError)
    expect(error.step).toBe('users')
    expect(mocks.catalogSeed).not.toHaveBeenCalled()
  })

  it('fails when the catalog returns empty restaurant/menuItem maps', async () => {
    const { deps, mocks } = buildDeps()
    mocks.catalogSeed.mockResolvedValue({
      ids: {
        categories: new Map([[1, oid(1)]]),
        restaurants: new Map(),
        menuItems: new Map(),
      },
      created: { categories: 18, restaurants: 0, menuItems: 0 },
    })

    const error = await runMasterSeed(deps).catch((e) => e)
    expect(error).toBeInstanceOf(MasterSeedError)
    expect(error.step).toBe('catalog')
    expect(mocks.ordersReviewsSeed).not.toHaveBeenCalled()
  })
})
