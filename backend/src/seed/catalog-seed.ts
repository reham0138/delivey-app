import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createHash } from 'crypto'
import { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { Category } from '../modules/categories/schemas/category.schema'
import { MenuItem } from '../modules/menu-items/schemas/menu-item.schema'
import { Restaurant } from '../modules/restaurants/schemas/restaurant.schema'

interface FixtureCategory {
  id: number
  name: string
  isActive: boolean
}

interface FixtureRestaurant {
  id: number
  ownerId: number
  name: string
  cuisine: string
  address: string
  phone: string
  deliveryTimeMinutes: number
  deliveryFee: number
  minOrder: number
  isOpen: boolean
  isActive: boolean
  image: string
  createdAt: string
}

interface FixtureMenuItem {
  id: number
  restaurantId: number
  name: string
  description: string
  price: number
  category: string
  image?: string | null
  isAvailable: boolean
  ingredients: string[]
  preparationTimeMinutes: number
  nutrition?: MenuItem['nutrition']
  isPopular: boolean
}

interface FixtureReview {
  menuItemId: number
  restaurantId: number
  rating: number
}

export interface CatalogFixtureIds {
  categories: ReadonlyMap<number, Types.ObjectId>
  restaurants: ReadonlyMap<number, Types.ObjectId>
  menuItems: ReadonlyMap<number, Types.ObjectId>
}

export interface CatalogSeedResult {
  ids: CatalogFixtureIds
  created: {
    categories: number
    restaurants: number
    menuItems: number
  }
}

export interface CatalogModels {
  categories: Model<Category>
  restaurants: Model<Restaurant>
  menuItems: Model<MenuItem>
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

// Deterministic ObjectIds: sha256 of `crown-anchor-catalog:<collection>:<fixtureId>`.
// Because the id is derived from the fixture id instead of being random, re-running
// the seed targets the same documents, so the replaceOne upserts make it idempotent.
function fixtureIds(rows: { id: number }[], collection: string): Map<number, Types.ObjectId> {
  return new Map(
    rows.map(({ id }) => [
      id,
      new Types.ObjectId(
        createHash('sha256')
          .update(`crown-anchor-catalog:${collection}:${id}`)
          .digest('hex')
          .slice(0, 24),
      ),
    ]),
  )
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('en')
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

export async function seedCatalogCollections(
  models: CatalogModels,
  userIds?: ReadonlyMap<number, Types.ObjectId>,
): Promise<CatalogSeedResult> {
  const categories = readFixture<FixtureCategory>('categories.json')
  const restaurants = readFixture<FixtureRestaurant>('restaurants.json')
  const menuItems = readFixture<FixtureMenuItem>('menu-items.json')
  const reviews = readFixture<FixtureReview>('reviews.json')

  const ids: CatalogFixtureIds = {
    categories: fixtureIds(categories, 'category'),
    restaurants: new Map(),
    menuItems: new Map(),
  }
  if (userIds) {
    const missingUserIds = [...new Set(restaurants.map((restaurant) => restaurant.ownerId))].filter(
      (id) => !userIds.has(id),
    )
    if (missingUserIds.length > 0) {
      throw new Error(
        `Missing user fixture IDs for restaurant owners: ${missingUserIds.join(', ')}`,
      )
    }
  }

  const categoryIdsByName = new Map(
    categories.map((category) => [
      normalizeName(category.name),
      mappedId(ids.categories, category.id, 'category'),
    ]),
  )
  const restaurantRatings = new Map<number, RatingTotals>()
  const menuItemRatings = new Map<number, RatingTotals>()
  for (const review of reviews) {
    addRating(menuItemRatings, review.menuItemId, review.rating)
    addRating(restaurantRatings, review.restaurantId, review.rating)
  }

  const categoryResult = await models.categories.bulkWrite(
    categories.map((category) => ({
      replaceOne: {
        filter: { _id: mappedId(ids.categories, category.id, 'category') },
        replacement: {
          _id: mappedId(ids.categories, category.id, 'category'),
          name: category.name,
          isActive: category.isActive,
        },
        upsert: true,
      },
    })),
    { ordered: true },
  )

  if (!userIds) {
    return {
      ids,
      created: { categories: categoryResult.upsertedCount, restaurants: 0, menuItems: 0 },
    }
  }

  ids.restaurants = fixtureIds(restaurants, 'restaurant')
  ids.menuItems = fixtureIds(menuItems, 'menu-item')

  const restaurantResult = await models.restaurants.bulkWrite(
    restaurants.map((restaurant) => {
      const rating = getRating(restaurantRatings, restaurant.id)
      const _id = mappedId(ids.restaurants, restaurant.id, 'restaurant')
      return {
        replaceOne: {
          filter: { _id },
          replacement: {
            _id,
            ownerId: mappedId(userIds, restaurant.ownerId, 'user'),
            name: restaurant.name,
            cuisine: restaurant.cuisine,
            address: restaurant.address,
            phone: restaurant.phone,
            deliveryTimeMinutes: restaurant.deliveryTimeMinutes,
            deliveryFee: restaurant.deliveryFee,
            minOrder: restaurant.minOrder,
            isOpen: restaurant.isOpen,
            isActive: restaurant.isActive,
            image: restaurant.image,
            cover: null,
            openingHours: '',
            ratingSum: rating.ratingSum,
            ratingCount: rating.ratingCount,
            createdAt: new Date(restaurant.createdAt),
          },
          upsert: true,
        },
      }
    }),
    { ordered: true },
  )

  const menuItemResult = await models.menuItems.bulkWrite(
    menuItems.map((menuItem) => {
      const _id = mappedId(ids.menuItems, menuItem.id, 'menu item')
      const categoryId = categoryIdsByName.get(normalizeName(menuItem.category))
      if (!categoryId) throw new Error(`Missing category fixture "${menuItem.category}"`)
      const rating = getRating(menuItemRatings, menuItem.id)
      return {
        replaceOne: {
          filter: { _id },
          replacement: {
            _id,
            restaurantId: mappedId(ids.restaurants, menuItem.restaurantId, 'restaurant'),
            // The schema caps names at 100 chars; one fixture name is longer.
            name: menuItem.name.slice(0, 100),
            description: menuItem.description,
            price: menuItem.price,
            categoryId,
            image: menuItem.image ?? null,
            isAvailable: menuItem.isAvailable,
            ingredients: menuItem.ingredients,
            preparationTimeMinutes: menuItem.preparationTimeMinutes,
            nutrition: menuItem.nutrition ?? null,
            isPopular: menuItem.isPopular,
            isActive: true,
            ratingSum: rating.ratingSum,
            ratingCount: rating.ratingCount,
          },
          upsert: true,
        },
      }
    }),
    { ordered: true },
  )

  return {
    ids,
    created: {
      categories: categoryResult.upsertedCount,
      restaurants: restaurantResult.upsertedCount,
      menuItems: menuItemResult.upsertedCount,
    },
  }
}
