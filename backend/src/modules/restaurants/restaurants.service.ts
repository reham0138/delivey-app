import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import type { PipelineStage } from 'mongoose'
import { AppException } from '../../common/errors'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { paginate } from '../../common/utils/pagination.util'
import { User, UserDocument } from '../users/schemas/user.schema'
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema'
import {
  ListAdminRestaurantsQueryDto,
  ListRestaurantsQueryDto,
  UpdateRestaurantDto,
  UpdateRestaurantStatusDto,
} from './dto/list-restaurants-query.dto'

export interface RestaurantRow {
  _id: Types.ObjectId
  ownerId: Types.ObjectId
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
  ratingSum?: number
  ratingCount?: number
  createdAt: Date
  ownerName?: string
  ownerEmail?: string
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

const SORT_FIELDS = {
  deliveryTime: 'deliveryTimeMinutes',
  deliveryFee: 'deliveryFee',
  name: 'name',
} as const

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function mapRestaurant(row: RestaurantRow): RestaurantResponse {
  const count = row.ratingCount ?? 0
  const rating = count === 0 ? 0 : Math.round(((row.ratingSum ?? 0) / count) * 10) / 10
  return {
    id: String(row._id),
    ownerId: String(row.ownerId),
    name: row.name,
    cuisine: row.cuisine,
    address: row.address,
    phone: row.phone,
    rating,
    reviewsCount: count,
    deliveryTimeMinutes: row.deliveryTimeMinutes,
    deliveryFee: row.deliveryFee,
    minOrder: row.minOrder,
    isOpen: row.isOpen,
    isActive: row.isActive,
    image: row.image,
    cover: row.cover,
    openingHours: row.openingHours,
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name) private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findAll(query: ListRestaurantsQueryDto) {
    const filter: Record<string, unknown> = { isActive: true }
    if (query.cuisine) filter.cuisine = new RegExp(`^${escapeRegex(query.cuisine.trim())}$`, 'i')
    if (query.isOpen !== undefined) filter.isOpen = query.isOpen === 'true'
    if (query.search) {
      const search = new RegExp(escapeRegex(query.search.trim()), 'i')
      filter.$or = [{ name: search }, { cuisine: search }]
    }

    const sort =
      query.sort === 'rating'
        ? { rating: -1 as const, name: 1 as const }
        : { [SORT_FIELDS[query.sort]]: 1 as const }
    const [total, rows] = await Promise.all([
      this.restaurantModel.countDocuments(filter),
      this.restaurantModel.aggregate<RestaurantRow>([
        { $match: filter },
        {
          $addFields: {
            rating: {
              $cond: [
                { $gt: ['$ratingCount', 0] },
                { $round: [{ $divide: ['$ratingSum', '$ratingCount'] }, 1] },
                0,
              ],
            },
          },
        },
        { $sort: sort },
        { $skip: (query.page - 1) * query.limit },
        { $limit: query.limit },
        {
          $project: {
            ownerId: 1,
            name: 1,
            cuisine: 1,
            address: 1,
            phone: 1,
            deliveryTimeMinutes: 1,
            deliveryFee: 1,
            minOrder: 1,
            isOpen: 1,
            isActive: 1,
            image: 1,
            cover: 1,
            openingHours: 1,
            ratingSum: 1,
            ratingCount: 1,
            createdAt: 1,
          },
        },
      ]),
    ])

    return paginate(rows.map(mapRestaurant), total, query)
  }

  async findOne(id: string): Promise<RestaurantResponse> {
    const restaurant = await this.findPublicRestaurant(id)
    return mapRestaurant(restaurant)
  }

  async findMine(user: AuthUser): Promise<RestaurantResponse> {
    const restaurant = await this.findOwnerRestaurant(user)
    return mapRestaurant(restaurant)
  }

  async updateMine(user: AuthUser, dto: UpdateRestaurantDto): Promise<RestaurantResponse> {
    const restaurant = await this.findOwnerRestaurant(user)
    if (dto.name !== undefined) restaurant.name = dto.name.trim()
    if (dto.cuisine !== undefined) restaurant.cuisine = dto.cuisine.trim()
    if (dto.address !== undefined) restaurant.address = dto.address.trim()
    if (dto.phone !== undefined) restaurant.phone = dto.phone.trim()
    if (dto.deliveryTimeMinutes !== undefined) {
      restaurant.deliveryTimeMinutes = dto.deliveryTimeMinutes
    }
    if (dto.deliveryFee !== undefined) restaurant.deliveryFee = dto.deliveryFee
    if (dto.minOrder !== undefined) restaurant.minOrder = dto.minOrder
    if (dto.image !== undefined) restaurant.image = dto.image.trim()
    if (dto.cover !== undefined) restaurant.cover = dto.cover?.trim() ?? null
    if (dto.openingHours !== undefined) restaurant.openingHours = dto.openingHours.trim()
    if (dto.isOpen !== undefined) restaurant.isOpen = dto.isOpen
    await restaurant.save()
    return mapRestaurant(restaurant)
  }

  async findAdmin(query: ListAdminRestaurantsQueryDto) {
    const match: Record<string, unknown> = {}
    if (query.isActive !== undefined) match.isActive = query.isActive === 'true'

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: this.userModel.collection.name,
          localField: 'ownerId',
          foreignField: '_id',
          as: 'owner',
        },
      },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
    ]
    if (query.search) {
      const pattern = escapeRegex(query.search.trim())
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: pattern, $options: 'i' } },
            { cuisine: { $regex: pattern, $options: 'i' } },
            { 'owner.name': { $regex: pattern, $options: 'i' } },
            { 'owner.email': { $regex: pattern, $options: 'i' } },
          ],
        },
      })
    }

    const [countRows, rows] = await Promise.all([
      this.restaurantModel.aggregate<{ total: number }>([...pipeline, { $count: 'total' }]),
      this.restaurantModel.aggregate<RestaurantRow>([
        ...pipeline,
        { $sort: { createdAt: -1 } },
        { $skip: (query.page - 1) * query.limit },
        { $limit: query.limit },
        {
          $project: {
            ownerId: 1,
            name: 1,
            cuisine: 1,
            address: 1,
            phone: 1,
            deliveryTimeMinutes: 1,
            deliveryFee: 1,
            minOrder: 1,
            isOpen: 1,
            isActive: 1,
            image: 1,
            cover: 1,
            openingHours: 1,
            ratingSum: 1,
            ratingCount: 1,
            createdAt: 1,
            ownerName: '$owner.name',
            ownerEmail: '$owner.email',
          },
        },
      ]),
    ])

    return paginate(
      rows.map((row) => ({
        ...mapRestaurant(row),
        ownerName: row.ownerName ?? '',
        ownerEmail: row.ownerEmail ?? '',
      })),
      countRows[0]?.total ?? 0,
      query,
    )
  }

  async updateStatus(id: string, dto: UpdateRestaurantStatusDto) {
    const restaurant = await this.requireById(id, { selectRatings: true })
    restaurant.isActive = dto.isActive
    await restaurant.save()
    const [row] = await this.restaurantModel.aggregate<RestaurantRow>([
      { $match: { _id: restaurant._id } },
      {
        $lookup: {
          from: this.userModel.collection.name,
          localField: 'ownerId',
          foreignField: '_id',
          as: 'owner',
        },
      },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          ownerId: 1,
          name: 1,
          cuisine: 1,
          address: 1,
          phone: 1,
          deliveryTimeMinutes: 1,
          deliveryFee: 1,
          minOrder: 1,
          isOpen: 1,
          isActive: 1,
          image: 1,
          cover: 1,
          openingHours: 1,
          ratingSum: 1,
          ratingCount: 1,
          createdAt: 1,
          ownerName: '$owner.name',
          ownerEmail: '$owner.email',
        },
      },
    ])
    if (!row) throw new AppException(404, ErrorCode.NotFound, 'Restaurant not found')
    return {
      ...mapRestaurant(row),
      ownerName: row.ownerName ?? '',
      ownerEmail: row.ownerEmail ?? '',
    }
  }

  private async findPublicRestaurant(id: string): Promise<RestaurantDocument> {
    const restaurant = await this.requireById(id, { activeOnly: true, selectRatings: true })
    return restaurant
  }

  private async findOwnerRestaurant(user: AuthUser): Promise<RestaurantDocument> {
    const restaurant = await this.restaurantModel
      .findOne({ ownerId: user.id })
      .select('+ratingSum +ratingCount')
      .exec()
    if (!restaurant) throw new AppException(404, ErrorCode.NotFound, 'Restaurant not found')
    return restaurant
  }

  private async requireById(
    id: string,
    options: { activeOnly?: boolean; selectRatings?: boolean } = {},
  ): Promise<RestaurantDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(404, ErrorCode.NotFound, 'Restaurant not found')
    }
    const filter: Record<string, unknown> = { _id: id }
    if (options.activeOnly) filter.isActive = true
    const query = this.restaurantModel.findOne(filter)
    if (options.selectRatings) query.select('+ratingSum +ratingCount')
    const restaurant = await query.exec()
    if (!restaurant) throw new AppException(404, ErrorCode.NotFound, 'Restaurant not found')
    return restaurant
  }
}
