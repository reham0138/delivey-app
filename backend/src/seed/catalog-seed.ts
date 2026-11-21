import { readFileSync } from 'fs'
import { resolve } from 'path'
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
  users: ReadonlyMap<number, Types.ObjectId>
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
  ids: CatalogFixtureIds,
): Promise<{ categories: number; restaurants: number; menuItems: number }> {
  const categories = readFixture<FixtureCategory>('categories.json')
  const restaurants = readFixture<FixtureRestaurant>('restaurants.json')
  const menuItems = readFixture<FixtureMenuItem>('menu-items.json')
  const reviews = readFixture<FixtureReview>('reviews.json')

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

  await Promise.all([
    models.categories.bulkWrite(
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
    ),
    models.restaurants.bulkWrite(
      restaurants.map((restaurant) => {
        const rating = getRating(restaurantRatings, restaurant.id)
        const _id = mappedId(ids.restaurants, restaurant.id, 'restaurant')
        return {
          replaceOne: {
            filter: { _id },
            replacement: {
              _id,
              ownerId: mappedId(ids.users, restaurant.ownerId, 'user'),
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
              cover: '',
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
    ),
    models.menuItems.bulkWrite(
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
              name: menuItem.name,
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
    ),
  ])

  return {
    categories: categories.length,
    restaurants: restaurants.length,
    menuItems: menuItems.length,
  }
}
