import { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { MenuItemsService } from './menu-items.service'
import type { MenuItemDocument } from './schemas/menu-item.schema'
import type { RestaurantDocument } from '../restaurants/schemas/restaurant.schema'
import type { CategoryDocument } from '../categories/schemas/category.schema'
import { RestaurantMenuItemsQueryDto } from './dto/list-menu-items-query.dto'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { Role } from '../../common/enums'
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu-item.dto'

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

describe('MenuItemsService owner mutations for inactive restaurants', () => {
  function createContext() {
    const ownerId = new Types.ObjectId().toHexString()
    const restaurantId = new Types.ObjectId()
    const itemId = new Types.ObjectId()
    const categoryId = new Types.ObjectId()
    const pipelines: unknown[][] = []
    const responseRow = {
      _id: itemId,
      restaurantId,
      name: 'Meal',
      description: 'Description',
      price: 10,
      image: null,
      isAvailable: true,
      ingredients: [],
      preparationTimeMinutes: 10,
      nutrition: null,
      isPopular: false,
      ratingSum: 0,
      ratingCount: 0,
      categoryName: 'Burgers',
    }
    const restaurantModel = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: restaurantId, isActive: false }),
        }),
      }),
      collection: { name: 'restaurants' },
    } as unknown as Model<RestaurantDocument>
    const categoryModel = {
      findOne: jest.fn().mockReturnValue({
        collation: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: categoryId }),
      }),
      collection: { name: 'categories' },
    } as unknown as Model<CategoryDocument>
    const menuItemModel = {
      aggregate: jest.fn((pipeline: unknown[]) => {
        pipelines.push(pipeline)
        return Promise.resolve([responseRow])
      }),
      create: jest.fn().mockResolvedValue({ _id: itemId }),
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: itemId,
            name: 'Meal',
            description: 'Description',
            price: 10,
            categoryId,
            ingredients: [],
            isAvailable: true,
            isPopular: false,
            save: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      }),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    } as unknown as Model<MenuItemDocument>

    return {
      service: new MenuItemsService(menuItemModel, restaurantModel, categoryModel),
      menuItemModel,
      restaurantModel,
      pipelines,
      ownerId,
      restaurantId,
      itemId,
      user: {
        id: ownerId,
        role: Role.Restaurant,
        email: 'owner@example.test',
        name: 'Owner',
      } satisfies AuthUser,
    }
  }

  it('creates a meal and builds its response without requiring an active restaurant', async () => {
    const context = createContext()
    const dto = {
      name: 'Meal',
      description: 'Description',
      price: 10,
      category: 'Burgers',
      ingredients: [],
      preparationTimeMinutes: 10,
    } satisfies CreateMenuItemDto

    const result = await context.service.createMine(context.user, dto)

    expect(result.id).toBe(context.itemId.toHexString())
    expect(context.restaurantModel.findOne).toHaveBeenCalledWith({ ownerId: context.ownerId })
    expect(context.pipelines[0][0]).toEqual({
      $match: { _id: context.itemId, restaurantId: context.restaurantId, isActive: true },
    })
    expect(context.pipelines[0].some((stage) =>
      typeof stage === 'object' &&
      stage !== null &&
      '$match' in stage &&
      typeof stage.$match === 'object' &&
      stage.$match !== null &&
      'restaurant.isActive' in stage.$match,
    )).toBe(false)
  })

  it('updates a meal owned by the inactive restaurant', async () => {
    const context = createContext()
    const dto = { name: 'Updated meal' } satisfies UpdateMenuItemDto

    const result = await context.service.updateMine(
      context.user,
      context.itemId.toHexString(),
      dto,
    )

    expect(result.id).toBe(context.itemId.toHexString())
    expect(context.restaurantModel.findOne).toHaveBeenCalledWith({ ownerId: context.ownerId })
    expect(context.pipelines[0][0]).toEqual({
      $match: { _id: context.itemId, restaurantId: context.restaurantId, isActive: true },
    })
  })

  it('deletes a meal owned by the inactive restaurant', async () => {
    const context = createContext()

    await expect(
      context.service.deleteMine(context.user, context.itemId.toHexString()),
    ).resolves.toBeUndefined()

    expect(context.restaurantModel.findOne).toHaveBeenCalledWith({ ownerId: context.ownerId })
    expect(context.menuItemModel.updateOne).toHaveBeenCalledWith(
      { _id: context.itemId, restaurantId: context.restaurantId, isActive: true },
      { $set: { isActive: false } },
    )
  })
})
