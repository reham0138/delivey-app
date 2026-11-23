import { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { MenuItemsService } from './menu-items.service'
import type { MenuItemDocument } from './schemas/menu-item.schema'
import type { RestaurantDocument } from '../restaurants/schemas/restaurant.schema'
import type { CategoryDocument } from '../categories/schemas/category.schema'

// Regression test: GET /menu-items/:id omitted `category` because the detail
// pipeline never ran the projection that adds `categoryName`.
describe('MenuItemsService.findOne', () => {
  it('includes the category projection stage', async () => {
    const pipelines: unknown[][] = []
    const row = {
      _id: new Types.ObjectId(),
      restaurantId: new Types.ObjectId(),
      name: 'Meal',
      description: '',
      price: 1,
      image: null,
      isAvailable: true,
      ingredients: [],
      preparationTimeMinutes: 5,
      nutrition: null,
      isPopular: false,
      ratingSum: 5,
      ratingCount: 1,
      categoryName: 'Burgers',
    }
    const menuItemModel = {
      aggregate: jest.fn((pipeline: unknown[]) => {
        pipelines.push(pipeline)
        return Promise.resolve([row])
      }),
    } as unknown as Model<MenuItemDocument>

    const service = new MenuItemsService(
      menuItemModel,
      { collection: { name: 'restaurants' } } as unknown as Model<RestaurantDocument>,
      { collection: { name: 'categories' } } as unknown as Model<CategoryDocument>,
    )

    const result = await service.findOne(new Types.ObjectId().toHexString())

    expect(result.category).toBe('Burgers')
    const projectStage = pipelines[0].find(
      (stage) => typeof stage === 'object' && stage !== null && '$project' in stage,
    ) as { $project: Record<string, unknown> } | undefined
    expect(projectStage?.$project.categoryName).toBe('$category.name')
  })
})
