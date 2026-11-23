import { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { RestaurantsService } from './restaurants.service'
import type { RestaurantDocument } from './schemas/restaurant.schema'
import type { UserDocument } from '../users/schemas/user.schema'
import { ListRestaurantsQueryDto } from './dto/list-restaurants-query.dto'

describe('RestaurantsService.findAll', () => {
  it('filters by minimum rating before counting and paginating', async () => {
    const pipelines: unknown[][] = []
    const row = {
      _id: new Types.ObjectId(),
      ownerId: new Types.ObjectId(),
      name: 'Restaurant',
      cuisine: 'Cuisine',
      address: '',
      phone: '',
      deliveryTimeMinutes: 20,
      deliveryFee: 0,
      minOrder: 0,
      isOpen: true,
      isActive: true,
      image: '',
      cover: null,
      openingHours: '',
      ratingSum: 9,
      ratingCount: 2,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }
    const restaurantModel = {
      aggregate: jest.fn((pipeline: unknown[]) => {
        pipelines.push(pipeline)
        return Promise.resolve(
          pipeline.some((stage) =>
            typeof stage === 'object' && stage !== null && '$count' in stage,
          )
            ? [{ total: 1 }]
            : [row],
        )
      }),
    } as unknown as Model<RestaurantDocument>
    const service = new RestaurantsService(
      restaurantModel,
      {} as Model<UserDocument>,
    )
    const query = Object.assign(new ListRestaurantsQueryDto(), {
      page: 1,
      limit: 8,
      sort: 'rating',
      minRating: 4.5,
    })

    const result = await service.findAll(query)

    expect(result.meta.total).toBe(1)
    expect(pipelines.every((pipeline) =>
      pipeline.some((stage) =>
        typeof stage === 'object' &&
        stage !== null &&
        '$match' in stage &&
        JSON.stringify(stage.$match) === JSON.stringify({ rating: { $gte: 4.5 } }),
      ),
    )).toBe(true)
  })
})
