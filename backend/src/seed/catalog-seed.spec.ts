import { readFileSync } from 'fs'
import { resolve } from 'path'
import mongoose, { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { Category } from '../modules/categories/schemas/category.schema'
import { MenuItem, MenuItemSchema } from '../modules/menu-items/schemas/menu-item.schema'
import { Restaurant } from '../modules/restaurants/schemas/restaurant.schema'
import { CatalogModels, seedCatalogCollections } from './catalog-seed'

interface FixtureWithId {
  id: number
}

interface FixtureCategory extends FixtureWithId {
  name: string
}

interface FixtureRestaurant extends FixtureWithId {
  ownerId: number
}

interface FixtureMenuItem extends FixtureWithId {
  category: string
}

interface FixtureReview {
  menuItemId: number
  restaurantId: number
  rating: number
}

function readFixture<T>(filename: string): T[] {
  return JSON.parse(
    readFileSync(resolve(__dirname, '../../../frontend/public/mock', filename), 'utf8'),
  ) as T[]
}

function fixtureIds(rows: FixtureWithId[]): Map<number, Types.ObjectId> {
  return new Map(rows.map((row) => [row.id, new Types.ObjectId()]))
}

describe('seedCatalogCollections', () => {
  it('returns stable fixture IDs, computes review ratings, and reports upsert counts', async () => {
    const categories = readFixture<FixtureCategory>('categories.json')
    const restaurants = readFixture<FixtureRestaurant>('restaurants.json')
    const menuItems = readFixture<FixtureMenuItem>('menu-items.json')
    const users = readFixture<FixtureWithId>('users.json')
    const reviews = readFixture<FixtureReview>('reviews.json')
    const userIds = fixtureIds(users)
    const categoryBulkWrite = jest
      .fn()
      .mockResolvedValueOnce({ upsertedCount: categories.length })
      .mockResolvedValueOnce({ upsertedCount: 0 })
    const restaurantBulkWrite = jest
      .fn()
      .mockResolvedValueOnce({ upsertedCount: restaurants.length })
      .mockResolvedValueOnce({ upsertedCount: 0 })
    const menuItemBulkWrite = jest
      .fn()
      .mockResolvedValueOnce({ upsertedCount: menuItems.length })
      .mockResolvedValueOnce({ upsertedCount: 0 })
    const models: CatalogModels = {
      categories: { bulkWrite: categoryBulkWrite } as unknown as Model<Category>,
      restaurants: { bulkWrite: restaurantBulkWrite } as unknown as Model<Restaurant>,
      menuItems: { bulkWrite: menuItemBulkWrite } as unknown as Model<MenuItem>,
    }

    const first = await seedCatalogCollections(models, userIds)
    const second = await seedCatalogCollections(models, userIds)

    expect(first.created).toEqual({
      categories: categories.length,
      restaurants: restaurants.length,
      menuItems: menuItems.length,
    })
    expect(second.created).toEqual({ categories: 0, restaurants: 0, menuItems: 0 })
    expect([...first.ids.categories.keys()]).toEqual(categories.map(({ id }) => id))
    expect([...first.ids.restaurants.keys()]).toEqual(restaurants.map(({ id }) => id))
    expect([...first.ids.menuItems.keys()]).toEqual(menuItems.map(({ id }) => id))

    const firstItemId = menuItems[0].id
    const itemReviews = reviews.filter((review) => review.menuItemId === firstItemId)
    const itemOperation = menuItemBulkWrite.mock.calls[0][0].find(
      (operation: { replaceOne: { filter: { _id: Types.ObjectId } } }) =>
        operation.replaceOne.filter._id.equals(first.ids.menuItems.get(firstItemId)),
    )
    expect(itemOperation.replaceOne.replacement.ratingSum).toBe(
      itemReviews.reduce((sum, review) => sum + review.rating, 0),
    )
    expect(itemOperation.replaceOne.replacement.ratingCount).toBe(itemReviews.length)
    expect(itemOperation.replaceOne.replacement.categoryId).toEqual(
      first.ids.categories.get(
        categories.find(
          (category) => category.name.toLowerCase() === menuItems[0].category.toLowerCase(),
        )?.id ?? -1,
      ),
    )

    const firstRestaurantId = restaurants[0].id
    const restaurantReviews = reviews.filter((review) => review.restaurantId === firstRestaurantId)
    const restaurantOperation = restaurantBulkWrite.mock.calls[0][0].find(
      (operation: { replaceOne: { filter: { _id: Types.ObjectId } } }) =>
        operation.replaceOne.filter._id.equals(first.ids.restaurants.get(firstRestaurantId)),
    )
    expect(restaurantOperation.replaceOne.replacement.ownerId).toEqual(
      userIds.get(restaurants[0].ownerId),
    )
    expect(restaurantOperation.replaceOne.replacement.ratingSum).toBe(
      restaurantReviews.reduce((sum, review) => sum + review.rating, 0),
    )
    expect(restaurantOperation.replaceOne.replacement.ratingCount).toBe(restaurantReviews.length)
    expect(menuItemBulkWrite.mock.calls[0][0][0].replaceOne.filter._id).toEqual(
      menuItemBulkWrite.mock.calls[1][0][0].replaceOne.filter._id,
    )
  })

  it('seeds only categories when no user map is supplied', async () => {
    const categories = readFixture<FixtureWithId>('categories.json')
    const categoryBulkWrite = jest.fn().mockResolvedValue({ upsertedCount: categories.length })
    const restaurantBulkWrite = jest.fn()
    const menuItemBulkWrite = jest.fn()
    const models: CatalogModels = {
      categories: { bulkWrite: categoryBulkWrite } as unknown as Model<Category>,
      restaurants: { bulkWrite: restaurantBulkWrite } as unknown as Model<Restaurant>,
      menuItems: { bulkWrite: menuItemBulkWrite } as unknown as Model<MenuItem>,
    }

    const result = await seedCatalogCollections(models)

    expect(result.created).toEqual({
      categories: categories.length,
      restaurants: 0,
      menuItems: 0,
    })
    expect(result.ids.restaurants.size).toBe(0)
    expect(result.ids.menuItems.size).toBe(0)
    expect(restaurantBulkWrite).not.toHaveBeenCalled()
    expect(menuItemBulkWrite).not.toHaveBeenCalled()
  })

  it('rejects an incomplete user map before writing any collection', async () => {
    const categoryBulkWrite = jest.fn()
    const restaurantBulkWrite = jest.fn()
    const menuItemBulkWrite = jest.fn()
    const models: CatalogModels = {
      categories: { bulkWrite: categoryBulkWrite } as unknown as Model<Category>,
      restaurants: { bulkWrite: restaurantBulkWrite } as unknown as Model<Restaurant>,
      menuItems: { bulkWrite: menuItemBulkWrite } as unknown as Model<MenuItem>,
    }

    await expect(seedCatalogCollections(models, new Map())).rejects.toThrow(
      'Missing user fixture IDs for restaurant owners',
    )
    expect(categoryBulkWrite).not.toHaveBeenCalled()
    expect(restaurantBulkWrite).not.toHaveBeenCalled()
    expect(menuItemBulkWrite).not.toHaveBeenCalled()
  })

  it('maps every real fixture meal to a document that passes schema validation', async () => {
    const categories = readFixture<FixtureCategory>('categories.json')
    const restaurants = readFixture<FixtureRestaurant>('restaurants.json')
    const menuItems = readFixture<FixtureMenuItem>('menu-items.json')
    const users = readFixture<FixtureWithId>('users.json')
    const userIds = fixtureIds(users)
    const menuItemBulkWrite = jest.fn().mockResolvedValue({ upsertedCount: menuItems.length })
    const models: CatalogModels = {
      categories: {
        bulkWrite: jest.fn().mockResolvedValue({ upsertedCount: categories.length }),
      } as unknown as Model<Category>,
      restaurants: {
        bulkWrite: jest.fn().mockResolvedValue({ upsertedCount: restaurants.length }),
      } as unknown as Model<Restaurant>,
      menuItems: { bulkWrite: menuItemBulkWrite } as unknown as Model<MenuItem>,
    }

    await seedCatalogCollections(models, userIds)

    const operations = menuItemBulkWrite.mock.calls[0][0] as Array<{
      replaceOne: { replacement: Record<string, unknown> }
    }>
    expect(operations).toHaveLength(menuItems.length)

    const MenuItemModel = mongoose.model('CatalogSeedMenuItem', MenuItemSchema)
    for (const operation of operations) {
      const doc = new MenuItemModel(operation.replaceOne.replacement)
      expect(doc.validateSync()).toBeUndefined()
    }
  })
})
