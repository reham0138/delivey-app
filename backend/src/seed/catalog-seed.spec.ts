import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { Category } from '../modules/categories/schemas/category.schema'
import { MenuItem } from '../modules/menu-items/schemas/menu-item.schema'
import { Restaurant } from '../modules/restaurants/schemas/restaurant.schema'
import { CatalogModels, seedCatalogCollections } from './catalog-seed'

interface FixtureWithId {
  id: number
}

interface FixtureCategory extends FixtureWithId {
  name: string
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
  it('maps fixture references and computes rating counters from review fixtures', async () => {
    const categories = readFixture<FixtureCategory>('categories.json')
    const restaurants = readFixture<FixtureWithId>('restaurants.json')
    const menuItems = readFixture<FixtureMenuItem>('menu-items.json')
    const users = readFixture<FixtureWithId>('users.json')
    const reviews = readFixture<FixtureReview>('reviews.json')
    const categoryIds = fixtureIds(categories)
    const restaurantIds = fixtureIds(restaurants)
    const menuItemIds = fixtureIds(menuItems)
    const userIds = fixtureIds(users)
    const categoryBulkWrite = jest.fn().mockResolvedValue(undefined)
    const restaurantBulkWrite = jest.fn().mockResolvedValue(undefined)
    const menuItemBulkWrite = jest.fn().mockResolvedValue(undefined)
    const models: CatalogModels = {
      categories: { bulkWrite: categoryBulkWrite } as unknown as Model<Category>,
      restaurants: { bulkWrite: restaurantBulkWrite } as unknown as Model<Restaurant>,
      menuItems: { bulkWrite: menuItemBulkWrite } as unknown as Model<MenuItem>,
    }

    const result = await seedCatalogCollections(models, {
      categories: categoryIds,
      restaurants: restaurantIds,
      menuItems: menuItemIds,
      users: userIds,
    })

    expect(result).toEqual({
      categories: categories.length,
      restaurants: restaurants.length,
      menuItems: menuItems.length,
    })

    const firstItemId = menuItems[0].id
    const itemReviews = reviews.filter((review) => review.menuItemId === firstItemId)
    const itemOperation = menuItemBulkWrite.mock.calls[0][0].find(
      (operation: { replaceOne: { filter: { _id: Types.ObjectId } } }) =>
        operation.replaceOne.filter._id.equals(menuItemIds.get(firstItemId)),
    )
    expect(itemOperation.replaceOne.replacement.ratingSum).toBe(
      itemReviews.reduce((sum, review) => sum + review.rating, 0),
    )
    expect(itemOperation.replaceOne.replacement.ratingCount).toBe(itemReviews.length)
    expect(itemOperation.replaceOne.replacement.categoryId).toEqual(
      categoryIds.get(
        categories.find(
          (category) => category.name.toLowerCase() === menuItems[0].category.toLowerCase(),
        )?.id ?? -1,
      ),
    )

    const firstRestaurantId = restaurants[0].id
    const restaurantReviews = reviews.filter((review) => review.restaurantId === firstRestaurantId)
    const restaurantOperation = restaurantBulkWrite.mock.calls[0][0].find(
      (operation: { replaceOne: { filter: { _id: Types.ObjectId } } }) =>
        operation.replaceOne.filter._id.equals(restaurantIds.get(firstRestaurantId)),
    )
    expect(restaurantOperation.replaceOne.replacement.ratingSum).toBe(
      restaurantReviews.reduce((sum, review) => sum + review.rating, 0),
    )
    expect(restaurantOperation.replaceOne.replacement.ratingCount).toBe(restaurantReviews.length)
  })
})
