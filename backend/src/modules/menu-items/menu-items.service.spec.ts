import { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { MenuItemsService } from './menu-items.service'
import type { MenuItemDocument } from './schemas/menu-item.schema'
import type { RestaurantDocument } from '../restaurants/schemas/restaurant.schema'
import type { CategoryDocument } from '../categories/schemas/category.schema'
import { RestaurantMenuItemsQueryDto } from './dto/list-menu-items-query.dto'

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

  describe('MenuItemsService.findForRestaurant', () => {
    it('applies the requested popularity sort before pagination', async () => {
      const pipelines: unknown[][] = []
      const menuItemModel = {
        aggregate: jest.fn((pipeline: unknown[]) => {
          pipelines.push(pipeline)
          return Promise.resolve([])
        }),
      } as unknown as Model<MenuItemDocument>
      const restaurantModel = {
        collection: { name: 'restaurants' },
        exists: jest.fn().mockResolvedValue(true),
      } as unknown as Model<RestaurantDocument>
      const categoryModel = {
        collection: { name: 'categories' },
      } as unknown as Model<CategoryDocument>
      const service = new MenuItemsService(menuItemModel, restaurantModel, categoryModel)
      const query = Object.assign(new RestaurantMenuItemsQueryDto(), {
        page: 1,
        limit: 8,
        sort: 'popular',
      })

      await service.findForRestaurant(new Types.ObjectId().toHexString(), query)

      expect(pipelines.some((pipeline) =>
        pipeline.some((stage) =>
          typeof stage === 'object' &&
          stage !== null &&
          '$sort' in stage &&
          JSON.stringify(stage.$sort) === JSON.stringify({ isPopular: -1, rating: -1, name: 1 }),
        ),
      )).toBe(true)
    })
  })
})
