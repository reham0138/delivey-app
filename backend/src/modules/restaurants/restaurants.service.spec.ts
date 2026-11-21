import 'reflect-metadata'
import type { Model } from 'mongoose'
import { RestaurantsService } from './restaurants.service'
import { ListRestaurantsQueryDto } from './dto/list-restaurants-query.dto'
import { Restaurant } from './schemas/restaurant.schema'

describe('RestaurantsService public reads', () => {
  it('filters active restaurants, sorts by rating, and maps rating fields', async () => {
    const aggregate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          data: [
            {
              _id: '64b000000000000000000001',
              ownerId: '64b000000000000000000002',
              name: 'Burger Hub',
              cuisine: 'Burgers',
              address: '1 Main St',
              phone: '123',
              deliveryTimeMinutes: 25,
              deliveryFee: 1.5,
              minOrder: 8,
              isOpen: false,
              isActive: true,
              image: '',
              cover: '',
              openingHours: '',
              ratingSum: 9,
              ratingCount: 2,
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
            },
          ],
          metadata: [{ total: 1 }],
        },
      ]),
    })
    const service = new RestaurantsService({ aggregate } as unknown as Model<Restaurant>)
    const query = Object.assign(new ListRestaurantsQueryDto(), {
      search: 'burger',
      isOpen: false,
      page: 1,
      limit: 10,
    })

    const response = await service.findAll(query)
    const pipeline = aggregate.mock.calls[0][0]

    expect(pipeline[0].$match).toMatchObject({
      isActive: true,
      isOpen: false,
    })
    expect(pipeline[0].$match.$or[0].name).toEqual(/burger/i)
    expect(pipeline[2]).toEqual({
      $sort: { _computedRating: -1, _id: 1 },
    })
    expect(response.data[0]).toEqual({
      id: '64b000000000000000000001',
      ownerId: '64b000000000000000000002',
      name: 'Burger Hub',
      cuisine: 'Burgers',
      address: '1 Main St',
      phone: '123',
      rating: 4.5,
      reviewsCount: 2,
      deliveryTimeMinutes: 25,
      deliveryFee: 1.5,
      minOrder: 8,
      isOpen: false,
      isActive: true,
      image: '',
      cover: '',
      openingHours: '',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })
})
