import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import type { Model } from 'mongoose'
import { MenuItemSort, ListMenuItemsQueryDto } from './dto/list-menu-items-query.dto'
import { MenuItemsService } from './menu-items.service'
import { MenuItem } from './schemas/menu-item.schema'
import { Restaurant } from '../restaurants/schemas/restaurant.schema'
import { Category } from '../categories/schemas/category.schema'

describe('MenuItemsService public reads', () => {
  it('parses explicit false query flags without treating them as truthy strings', () => {
    const query = plainToInstance(ListMenuItemsQueryDto, {
      isPopular: 'false',
      openOnly: 'true',
      includeUnavailable: 'false',
      limit: '8',
    })

    expect(validateSync(query, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0)
    expect(query.isPopular).toBe(false)
    expect(query.openOnly).toBe(true)
    expect(query.includeUnavailable).toBe(false)
    expect(query.limit).toBe(8)
  })

  it('filters active/open restaurants and maps internal category and rating fields', async () => {
    const aggregate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          data: [
            {
              _id: '64b000000000000000000001',
              restaurantId: '64b000000000000000000002',
              name: 'Beef bowl',
              description: 'Rice and beef',
              price: 12.5,
              category: 'Bowls',
              image: null,
              isAvailable: true,
              ingredients: ['Beef', 'Rice'],
              preparationTimeMinutes: 15,
              nutrition: null,
              ratingSum: 9.3,
              ratingCount: 2,
              isPopular: false,
            },
          ],
          metadata: [{ total: 1 }],
        },
      ]),
    })
    const service = new MenuItemsService(
      { aggregate, collection: { name: 'menuitems' } } as unknown as Model<MenuItem>,
      { collection: { name: 'restaurants' } } as unknown as Model<Restaurant>,
      { collection: { name: 'categories' } } as unknown as Model<Category>,
    )
    const query = Object.assign(new ListMenuItemsQueryDto(), {
      category: 'Bowls',
      search: 'beef',
      openOnly: true,
      includeUnavailable: true,
      sort: MenuItemSort.PriceDescending,
      page: 1,
      limit: 8,
    })

    const response = await service.findAll(query)
    const pipeline = aggregate.mock.calls[0][0]

    expect(pipeline[0]).toEqual({ $match: { isActive: true } })
    expect(pipeline).toContainEqual({
      $match: { 'restaurant.isActive': true, 'restaurant.isOpen': true },
    })
    expect(pipeline).toContainEqual({
      $sort: { price: -1, _id: 1 },
    })
    expect(response).toEqual({
      data: [
        {
          id: '64b000000000000000000001',
          restaurantId: '64b000000000000000000002',
          name: 'Beef bowl',
          description: 'Rice and beef',
          price: 12.5,
          category: 'Bowls',
          image: null,
          isAvailable: true,
          ingredients: ['Beef', 'Rice'],
          preparationTimeMinutes: 15,
          nutrition: null,
          rating: 4.7,
          reviewsCount: 2,
          isPopular: false,
        },
      ],
      meta: { total: 1, page: 1, limit: 8, total_pages: 1 },
    })
  })

  it('rejects reversed price bounds', async () => {
    const service = new MenuItemsService(
      {} as Model<MenuItem>,
      {} as Model<Restaurant>,
      {} as Model<Category>,
    )
    const query = Object.assign(new ListMenuItemsQueryDto(), {
      minPrice: 20,
      maxPrice: 10,
    })

    await expect(service.findAll(query)).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })

  it('returns an unavailable item by ID while excluding inactive items', async () => {
    const aggregate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          data: [
            {
              _id: '64b000000000000000000001',
              restaurantId: '64b000000000000000000002',
              name: 'Beef bowl',
              description: 'Rice and beef',
              price: 12.5,
              category: 'Bowls',
              image: null,
              isAvailable: false,
              ingredients: ['Beef', 'Rice'],
              preparationTimeMinutes: 15,
              nutrition: null,
              ratingSum: 0,
              ratingCount: 0,
              isPopular: false,
            },
          ],
          metadata: [{ total: 1 }],
        },
      ]),
    })
    const service = new MenuItemsService(
      { aggregate, collection: { name: 'menuitems' } } as unknown as Model<MenuItem>,
      { collection: { name: 'restaurants' } } as unknown as Model<Restaurant>,
      { collection: { name: 'categories' } } as unknown as Model<Category>,
    )

    const response = await service.findOne('64b000000000000000000001')
    const pipeline = aggregate.mock.calls[0][0]

    expect(pipeline[0].$match).toEqual({
      _id: expect.anything(),
      isActive: true,
    })
    expect(pipeline[0].$match).not.toHaveProperty('isAvailable')
    expect(response.isAvailable).toBe(false)
  })
})
