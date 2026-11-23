import 'dotenv/config'
import { spawnSync } from 'child_process'
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { resolve } from 'path'
import mongoose from 'mongoose'
import type { Model } from 'mongoose'
// Registers the global schema defaults (timestamps, id virtual) before any
// schema module below is evaluated, so seeded documents keep timestamps.
import '../database/mongoose.plugin'
import { Category, CategorySchema } from '../modules/categories/schemas/category.schema'
import { MenuItem, MenuItemSchema } from '../modules/menu-items/schemas/menu-item.schema'
import { Order, OrderSchema } from '../modules/orders/schemas/order.schema'
import { Restaurant, RestaurantSchema } from '../modules/restaurants/schemas/restaurant.schema'
import { Review, ReviewSchema } from '../modules/reviews/schemas/review.schema'
import { User, UserSchema } from '../modules/users/schemas/user.schema'
import {
  CatalogModels,
  CatalogSeedResult,
  seedCatalogCollections,
} from './catalog-seed'
import {
  MasterUsersSeedModels,
  MasterUsersSeedResult,
  seedMasterUsers,
} from './master-users-seed'
import {
  OrdersReviewsModels,
  seedOrdersReviews,
} from './orders-reviews-seed'

const nodeRequire = createRequire(__filename)

export interface ReconcileOutcome {
  /** how many menu-item/restaurant counter pairs changed during reconcile */
  changed: number
}

export interface MasterSeedDeps {
  users: Model<User>
  catalog: CatalogModels
  ordersReviews: OrdersReviewsModels
  /** injectable for tests; defaults to the real seed functions */
  seeds?: {
    users?: (models: MasterUsersSeedModels) => Promise<MasterUsersSeedResult>
    catalog?: (
      models: CatalogModels,
      userIds?: ReadonlyMap<number, mongoose.Types.ObjectId>,
    ) => Promise<CatalogSeedResult>
    ordersReviews?: typeof seedOrdersReviews
  }
  /** injectable for tests; defaults to spawning `ratings:reconcile` + diff */
  reconcile?: () => Promise<ReconcileOutcome>
  log?: (message: string) => void
}

export interface SeedStepSummary {
  step: string
  created: number
  existing: number
  skipped: number
  detail?: string
}

export interface MasterSeedSummary {
  steps: SeedStepSummary[]
}

export class MasterSeedError extends Error {
  constructor(
    public readonly step: string,
    public readonly completed: SeedStepSummary[],
    cause: unknown,
  ) {
    super(
      `Seed step "${step}" failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    )
    this.name = 'MasterSeedError'
  }
}

function fixtureCount(filename: string): number {
  const fixturePath = resolve(__dirname, '../../../frontend/public/mock', filename)
  return (JSON.parse(readFileSync(fixturePath, 'utf8')) as unknown[]).length
}

interface CounterSnapshot {
  [key: string]: string
}

async function snapshotCounters(models: OrdersReviewsModels): Promise<CounterSnapshot> {
  const [items, restaurants] = await Promise.all([
    models.menuItems.find({}).select('ratingSum ratingCount').lean().exec(),
    models.restaurants.find({}).select('ratingSum ratingCount').lean().exec(),
  ])
  const snap: CounterSnapshot = {}
  for (const item of items) {
    snap[`item:${String(item._id)}`] = `${item.ratingSum}/${item.ratingCount}`
  }
  for (const restaurant of restaurants) {
    snap[`restaurant:${String(restaurant._id)}`] = `${restaurant.ratingSum}/${restaurant.ratingCount}`
  }
  return snap
}

function countCounterChanges(before: CounterSnapshot, after: CounterSnapshot): number {
  let changed = 0
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) changed += 1
  }
  return changed
}

// reconcile-ratings.ts is a script without exports, so the runner spawns it as
// a child process (same env, so the same MONGODB_URI is used) and diffs the
// rating counters before/after to report whether anything changed.
async function defaultReconcile(
  ordersReviews: OrdersReviewsModels,
): Promise<ReconcileOutcome> {
  const before = await snapshotCounters(ordersReviews)
  const tsNodeBin = nodeRequire.resolve('ts-node/dist/bin.js')
  const result = spawnSync(process.execPath, [tsNodeBin, 'src/seed/reconcile-ratings.ts'], {
    stdio: 'inherit',
    env: process.env,
    cwd: process.cwd(),
  })
  if (result.status !== 0) {
    throw new Error(`ratings:reconcile exited with code ${result.status ?? 'unknown'}`)
  }
  const after = await snapshotCounters(ordersReviews)
  return { changed: countCounterChanges(before, after) }
}

// Master seed runner (contract section 10): users -> catalog -> orders/reviews
// -> rating reconcile. Non-destructive and idempotent: every step upserts on
// deterministic or natural keys, so re-running creates nothing new. Stops at
// the first failure; re-running after a failure is safe.
export async function runMasterSeed(deps: MasterSeedDeps): Promise<MasterSeedSummary> {
  const log = deps.log ?? ((message: string) => console.log(message))
  const steps: SeedStepSummary[] = []
  const usersSeed = deps.seeds?.users ?? ((models: MasterUsersSeedModels) => seedMasterUsers(models))
  const catalogSeed = deps.seeds?.catalog ?? seedCatalogCollections
  const ordersReviewsSeed = deps.seeds?.ordersReviews ?? seedOrdersReviews
  const reconcile = deps.reconcile ?? (() => defaultReconcile(deps.ordersReviews))

  const runStep = async <T>(
    name: string,
    work: () => Promise<T>,
    summarize: (result: T) => SeedStepSummary,
  ): Promise<T> => {
    try {
      log(`Step "${name}": running...`)
      const result = await work()
      steps.push(summarize(result))
      log(`Step "${name}": done.`)
      return result
    } catch (error) {
      throw new MasterSeedError(name, [...steps], error)
    }
  }

  // 1. users
  const usersResult = await runStep(
    'users',
    () => usersSeed({ users: deps.users }),
    (r) => ({
      step: 'users',
      created: r.created,
      existing: r.existing,
      skipped: r.skipped,
      detail: r.adminCreated ? 'admin created' : 'admin already existed',
    }),
  )
  if (usersResult.ids.size !== fixtureCount('users.json')) {
    throw new MasterSeedError('users', [...steps], {
      message: `users id map incomplete: ${usersResult.ids.size} entries for ${fixtureCount('users.json')} fixture users`,
    })
  }

  // 2. catalog (categories, restaurants, menu items)
  const catalogResult = await runStep(
    'catalog',
    () => catalogSeed(deps.catalog, usersResult.ids),
    (r) => ({
      step: 'catalog',
      created: r.created.categories + r.created.restaurants + r.created.menuItems,
      existing:
        fixtureCount('categories.json') +
        fixtureCount('restaurants.json') +
        fixtureCount('menu-items.json') -
        (r.created.categories + r.created.restaurants + r.created.menuItems),
      skipped: 0,
      detail: `${r.created.categories} categories, ${r.created.restaurants} restaurants, ${r.created.menuItems} menu items created`,
    }),
  )
  if (
    catalogResult.ids.restaurants.size === 0 ||
    catalogResult.ids.menuItems.size === 0
  ) {
    throw new MasterSeedError('catalog', [...steps], {
      message:
        'catalog seed returned incomplete id maps (restaurants/menuItems empty); orders/reviews seed cannot run',
    })
  }

  // 3. orders and reviews
  await runStep(
    'orders/reviews',
    () =>
      ordersReviewsSeed(deps.ordersReviews, {
        users: usersResult.ids,
        restaurants: catalogResult.ids.restaurants,
        menuItems: catalogResult.ids.menuItems,
      }),
    (r) => ({
      step: 'orders/reviews',
      created: r.created.orders + r.created.reviews,
      existing:
        fixtureCount('orders.json') + fixtureCount('reviews.json') - r.created.orders - r.created.reviews,
      skipped: 0,
      detail: `${r.created.orders} orders, ${r.created.reviews} reviews created; ${r.created.ratingCounters} counters updated`,
    }),
  )

  // 4. rating counter reconcile (safe to run twice)
  await runStep(
    'reconcile',
    () => reconcile(),
    (r) => ({
      step: 'reconcile',
      created: 0,
      existing: 0,
      skipped: 0,
      detail: `${r.changed} rating counter(s) changed`,
    }),
  )

  return { steps }
}

export function printMasterSeedSummary(summary: MasterSeedSummary): void {
  console.log('\nSeed summary:')
  console.table(
    summary.steps.map((s) => ({
      step: s.step,
      created: s.created,
      existing: s.existing,
      skipped: s.skipped,
      detail: s.detail ?? '',
    })),
  )
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI must be set in .env')

  await mongoose.connect(uri)
  try {
    // Print the database name only — never the connection string.
    console.log(`Seeding database: ${mongoose.connection.db?.databaseName ?? 'unknown'}`)

    const summary = await runMasterSeed({
      users: mongoose.model(User.name, UserSchema),
      catalog: {
        categories: mongoose.model(Category.name, CategorySchema),
        restaurants: mongoose.model(Restaurant.name, RestaurantSchema),
        menuItems: mongoose.model(MenuItem.name, MenuItemSchema),
      },
      ordersReviews: {
        orders: mongoose.model(Order.name, OrderSchema),
        reviews: mongoose.model(Review.name, ReviewSchema),
        menuItems: mongoose.model(MenuItem.name, MenuItemSchema),
        restaurants: mongoose.model(Restaurant.name, RestaurantSchema),
      },
    })
    printMasterSeedSummary(summary)
  } catch (error) {
    if (error instanceof MasterSeedError) {
      console.error(`\nSeed failed at step "${error.step}": ${error.message}`)
      console.error('Completed steps:')
      console.table(
        error.completed.map((s) => ({
          step: s.step,
          created: s.created,
          existing: s.existing,
          skipped: s.skipped,
        })),
      )
    } else {
      console.error(error instanceof Error ? error.message : error)
    }
    console.error('Re-running `npm run seed` is safe — every step is idempotent.')
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

// Only run when executed directly (`npm run seed`), not when imported by tests.
if (require.main === module) {
  void main()
}
