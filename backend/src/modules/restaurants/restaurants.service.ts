import { Injectable, HttpStatus } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { FilterQuery, Model, PipelineStage } from 'mongoose'
import { AppException } from '../../common/errors/app.exception'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import { paginate } from '../../common/utils/pagination.util'
import { ListRestaurantsQueryDto, RestaurantSort } from './dto/list-restaurants-query.dto'
import { Restaurant } from './schemas/restaurant.schema'

interface RestaurantAggregateRecord {
  _id: { toString(): string }
  ownerId: { toString(): string }
  name: string
  cuisine: string
  address: string
  phone: string
  deliveryTimeMinutes: number
  deliveryFee: number
  minOrder: number
  isOpen: boolean
  isActive: boolean
  image: string
  cover: string | null
  openingHours: string
  ratingSum: number
  ratingCount: number
  createdAt: Date
}

interface RestaurantListFacet {
  data: RestaurantAggregateRecord[]
  metadata: Array<{ total: number }>
}

export interface RestaurantResponse {
  id: string
  ownerId: string
  name: string
  cuisine: string
  address: string
  phone: string
  rating: number
  reviewsCount: number
  deliveryTimeMinutes: number
  deliveryFee: number
  minOrder: number
  isOpen: boolean
  isActive: boolean
  image: string
  cover: string | null
  openingHours: string
  createdAt: string
}

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<Restaurant>,
  ) {}

  async findAll(query: ListRestaurantsQueryDto) {
    const filter: FilterQuery<Restaurant> = { isActive: true }
    if (query.search) {
      const search = new RegExp(escapeRegex(query.search), 'i')
      filter.$or = [{ name: search }, { cuisine: search }]
    }
    if (query.cuisine) {
      filter.cuisine = new RegExp(`^${escapeRegex(query.cuisine)}$`, 'i')
    }
    if (query.isOpen !== undefined) filter.isOpen = query.isOpen

    const sortField: Record<RestaurantSort, string> = {
      [RestaurantSort.Rating]: '_computedRating',
      [RestaurantSort.DeliveryTime]: 'deliveryTimeMinutes',
      [RestaurantSort.DeliveryFee]: 'deliveryFee',
      [RestaurantSort.Name]: 'name',
    }
    const sortDirection = query.sort === RestaurantSort.Rating ? -1 : 1
    const skip = (query.page - 1) * query.limit
    const pipeline: PipelineStage[] = [
      { $match: filter },
      {
        $addFields: {
          _computedRating: {
            $cond: [{ $gt: ['$ratingCount', 0] }, { $divide: ['$ratingSum', '$ratingCount'] }, 0],
          },
        },
      },
      { $sort: { [sortField[query.sort]]: sortDirection, _id: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: query.limit }],
          metadata: [{ $count: 'total' }],
        },
      },
    ]
    const [result] = await this.restaurantModel.aggregate<RestaurantListFacet>(pipeline).exec()
    if (!result) throw new Error('Restaurant list aggregation returned no result')
    const total = result.metadata[0]?.total ?? 0
    const data = result.data.map(mapRestaurant)
    return paginate(data, total, query)
  }

  async findOne(id: string): Promise<RestaurantResponse> {
    if (!isObjectId(id)) throw notFound()
    const restaurant = await this.restaurantModel
      .findOne({ _id: id, isActive: true })
      .select('+ratingSum +ratingCount')
      .lean()
      .exec()
    if (!restaurant) throw notFound()
    return mapRestaurant(restaurant)
  }
}

function mapRestaurant(restaurant: RestaurantAggregateRecord): RestaurantResponse {
  const ratingSum = restaurant.ratingSum ?? 0
  const reviewsCount = restaurant.ratingCount ?? 0
  const rating = reviewsCount > 0 ? Number((ratingSum / reviewsCount).toFixed(1)) : 0
  return {
    id: String(restaurant._id),
    ownerId: String(restaurant.ownerId),
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    address: restaurant.address,
    phone: restaurant.phone,
    rating,
    reviewsCount,
    deliveryTimeMinutes: restaurant.deliveryTimeMinutes,
    deliveryFee: restaurant.deliveryFee,
    minOrder: restaurant.minOrder,
    isOpen: restaurant.isOpen,
    isActive: restaurant.isActive,
    image: restaurant.image,
    cover: restaurant.cover,
    openingHours: restaurant.openingHours,
    createdAt: new Date(restaurant.createdAt).toISOString(),
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value)
}

function notFound(): AppException {
  return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NotFound, 'Restaurant not found')
}
