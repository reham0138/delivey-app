import { AppException } from '../../common/errors'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import type { Model } from 'mongoose'
import { CategoryDocument } from './schemas/category.schema'
import { MenuItem } from '../menu-items/schemas/menu-item.schema'
import { Restaurant } from '../restaurants/schemas/restaurant.schema'
import { CategoriesService } from './categories.service'

describe('CategoriesService admin operations', () => {
  it('lists inactive categories for admins while public lists remain active-only', async () => {
    const categoryModel = {
      countDocuments: jest.fn().mockResolvedValue(1),
      aggregate: jest
        .fn()
        .mockResolvedValueOnce([
          {
            _id: { toString: () => 'active-category' },
            name: 'Burgers',
            isActive: true,
            itemsCount: 2,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: { toString: () => 'inactive-category' },
            name: 'Seasonal',
            isActive: false,
            itemsCount: 0,
          },
        ]),
    }
    const menuItemModel = { collection: { name: 'menuitems' } }
    const restaurantModel = { collection: { name: 'restaurants' } }
    const service = new CategoriesService(
      categoryModel as unknown as Model<CategoryDocument>,
      menuItemModel as unknown as Model<MenuItem>,
      restaurantModel as unknown as Model<Restaurant>,
    )
    const query = { page: 1, limit: 100 }

    const publicResponse = await service.findAll(query)
    const adminResponse = await service.findAdmin(query)

    expect(categoryModel.countDocuments).toHaveBeenNthCalledWith(1, { isActive: true })
    expect(categoryModel.countDocuments).toHaveBeenNthCalledWith(2, {})
    expect(publicResponse.data[0].isActive).toBe(true)
    expect(adminResponse.data[0]).toMatchObject({
      name: 'Seasonal',
      isActive: false,
      itemsCount: 0,
    })

    const itemLookup = categoryModel.aggregate.mock.calls[0][0].find(
      (stage: { $lookup?: { from: string } }) => stage.$lookup?.from === 'menuitems',
    )
    expect(itemLookup.$lookup.pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: 'restaurants' }),
        }),
        { $match: { activeRestaurant: { $ne: [] } } },
      ]),
    )
  })

  it('maps case-insensitive duplicate-name errors to CATEGORY_NAME_TAKEN', async () => {
    const duplicateError = Object.assign(new Error('duplicate key'), { code: 11000 })
    const categoryModel = {
      create: jest.fn().mockRejectedValue(duplicateError),
    }
    const menuItemModel = { collection: { name: 'menuitems' } }
    const restaurantModel = { collection: { name: 'restaurants' } }
    const service = new CategoriesService(
      categoryModel as unknown as Model<CategoryDocument>,
      menuItemModel as unknown as Model<MenuItem>,
      restaurantModel as unknown as Model<Restaurant>,
    )

    const error = await service.create({ name: 'burgers' }).then(
      () => null,
      (reason: unknown) => reason,
    )
    expect(error).toBeInstanceOf(AppException)
    if (error instanceof AppException) {
      expect(error.code).toBe(ErrorCode.CategoryNameTaken)
      expect(error.getStatus()).toBe(409)
    }
  })
})
