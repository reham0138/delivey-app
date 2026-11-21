import 'reflect-metadata'
import type { Model } from 'mongoose'
import { CategoriesService } from './categories.service'
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto'
import { Category } from './schemas/category.schema'
import { MenuItem } from '../menu-items/schemas/menu-item.schema'

describe('CategoriesService public reads', () => {
  it('returns only active categories with counts of active menu items', async () => {
    const categoryId = '64b000000000000000000001'
    const categories = [{ _id: categoryId, name: 'Bowls', isActive: true }]
    const findQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(categories),
    }
    const find = jest.fn().mockReturnValue(findQuery)
    const countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    })
    const aggregate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ _id: categoryId, itemsCount: 3 }]),
    })
    const service = new CategoriesService(
      { find, countDocuments } as unknown as Model<Category>,
      { aggregate } as unknown as Model<MenuItem>,
    )

    const response = await service.findAll(new ListCategoriesQueryDto())

    expect(find).toHaveBeenCalledWith({ isActive: true })
    expect(aggregate).toHaveBeenCalledWith([
      { $match: { isActive: true, categoryId: { $in: [categoryId] } } },
      { $group: { _id: '$categoryId', itemsCount: { $sum: 1 } } },
    ])
    expect(response).toEqual({
      data: [{ id: categoryId, name: 'Bowls', isActive: true, itemsCount: 3 }],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    })
  })
})
