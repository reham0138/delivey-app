import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { FilterQuery, Model, PipelineStage } from 'mongoose'
import { Types } from 'mongoose'
import { AppException } from '../../common/errors/app.exception'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import { paginate } from '../../common/utils/pagination.util'
import {
  ListMenuItemsQueryDto,
  MenuItemSort,
  RestaurantMenuItemsQueryDto,
} from './dto/list-menu-items-query.dto'
import { MenuItem } from './schemas/menu-item.schema'
import { Restaurant } from '../restaurants/schemas/restaurant.schema'
import { Category } from '../categories/schemas/category.schema'

interface MenuItemAggregateRecord {
  _id: Types.ObjectId
  restaurantId: Types.ObjectId
  name: string
  description: string
  price: number
  category: string
  image: string | null
  isAvailable: boolean
  ingredients: string[]
  preparationTimeMinutes: number
  nutrition: MenuItem['nutrition']
  ratingSum: number
  ratingCount: number
  isPopular: boolean
}

interface MenuItemListFacet {
  data: MenuItemAggregateRecord[]
  metadata: Array<{ total: number }>
}

export interface MenuItemResponse {
  id: string
  restaurantId: string
  name: string
  description: string
  price: number
  category: string
  image: string | null
  isAvailable: boolean
  ingredients: string[]
  preparationTimeMinutes: number
  nutrition: MenuItem['nutrition']
  rating: number
  reviewsCount: number
  isPopular: boolean
}

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItem>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<Restaurant>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
  ) {}

  async findForRestaurant(restaurantId: string, query: RestaurantMenuItemsQueryDto) {
    const objectId = parseObjectId(restaurantId)
    if (!objectId) throw restaurantNotFound()

    const restaurantExists = await this.restaurantModel.exists({
      _id: objectId,
      isActive: true,
    })
    if (!restaurantExists) throw restaurantNotFound()

    const result = await this.queryItems(query, objectId, MenuItemSort.Rating, false)
    return paginate(result.data, result.total, query)
  }

  async findAll(query: ListMenuItemsQueryDto) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.ValidationError,
        'minPrice must be less than or equal to maxPrice',
        [{ field: 'minPrice', message: 'Must not exceed maxPrice' }],
      )
    }

    const restaurantId = query.restaurantId ? parseObjectId(query.restaurantId) : undefined
    if (query.restaurantId && !restaurantId) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.ValidationError,
        'restaurantId must be a valid ObjectId',
        [{ field: 'restaurantId', message: 'Must be a valid ObjectId' }],
      )
    }
    const result = await this.queryItems(query, restaurantId, query.sort, query.openOnly === true)
    return paginate(result.data, result.total, query)
  }

  async findOne(id: string): Promise<MenuItemResponse> {
    const objectId = parseObjectId(id)
    if (!objectId) throw menuItemNotFound()

    const result = await this.queryItems(
      { page: 1, limit: 1, includeUnavailable: true },
      undefined,
      MenuItemSort.Rating,
      false,
      { _id: objectId },
    )
    if (!result.data[0]) throw menuItemNotFound()
    return result.data[0]
  }

  private async queryItems(
    query: RestaurantMenuItemsQueryDto | ListMenuItemsQueryDto,
    restaurantId: Types.ObjectId | undefined,
    sort: MenuItemSort,
    openOnly: boolean,
    additionalMatch: FilterQuery<MenuItem> = {},
  ): Promise<{ data: MenuItemResponse[]; total: number }> {
    const match: FilterQuery<MenuItem> = {
      ...additionalMatch,
      isActive: true,
    }
    if (restaurantId) match.restaurantId = restaurantId
    if (!query.includeUnavailable) match.isAvailable = true

    if ('minPrice' in query && query.minPrice !== undefined) {
      match.price = { ...match.price, $gte: query.minPrice }
    }
    if ('maxPrice' in query && query.maxPrice !== undefined) {
      match.price = { ...match.price, $lte: query.maxPrice }
    }
    if ('isPopular' in query && query.isPopular !== undefined) {
      match.isPopular = query.isPopular
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: this.restaurantModel.collection.name,
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      { $unwind: '$restaurant' },
      {
        $match: {
          'restaurant.isActive': true,
          ...(openOnly ? { 'restaurant.isOpen': true } : {}),
        },
      },
      {
        $lookup: {
          from: this.categoryModel.collection.name,
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
    ]

    if (query.category) {
      pipeline.push({
        $match: {
          'category.name': new RegExp(`^${escapeRegex(query.category)}$`, 'i'),
        },
      })
    }
    if (query.search) {
      const search = new RegExp(escapeRegex(query.search), 'i')
      pipeline.push({
        $match: { $or: [{ name: search }, { description: search }] },
      })
    }

    const sortField: Record<MenuItemSort, string> = {
      [MenuItemSort.Rating]: '_computedRating',
      [MenuItemSort.PriceAscending]: 'price',
      [MenuItemSort.PriceDescending]: 'price',
      [MenuItemSort.Name]: 'name',
    }
    const sortDirection =
      sort === MenuItemSort.Rating || sort === MenuItemSort.PriceDescending ? -1 : 1
    pipeline.push(
      {
        $addFields: {
          _computedRating: {
            $cond: [{ $gt: ['$ratingCount', 0] }, { $divide: ['$ratingSum', '$ratingCount'] }, 0],
          },
        },
      },
      {
        $sort: {
          [sortField[sort]]: sortDirection,
          _id: 1,
        },
      },
      {
        $facet: {
          data: [
            { $skip: (query.page - 1) * query.limit },
            { $limit: query.limit },
            {
              $project: {
                _id: 1,
                restaurantId: 1,
                name: 1,
                description: 1,
                price: 1,
                category: '$category.name',
                image: 1,
                isAvailable: 1,
                ingredients: 1,
                preparationTimeMinutes: 1,
                nutrition: 1,
                ratingSum: 1,
                ratingCount: 1,
                isPopular: 1,
              },
            },
          ],
          metadata: [{ $count: 'total' }],
        },
      },
    )

    const [result] = await this.menuItemModel.aggregate<MenuItemListFacet>(pipeline).exec()
    if (!result) throw new Error('Menu item list aggregation returned no result')
    const total = result.metadata[0]?.total ?? 0
    const data = result.data.map(mapMenuItem)
    return { data, total }
  }
}

function mapMenuItem(menuItem: MenuItemAggregateRecord): MenuItemResponse {
  const ratingSum = menuItem.ratingSum ?? 0
  const reviewsCount = menuItem.ratingCount ?? 0
  const rating = reviewsCount > 0 ? Number((ratingSum / reviewsCount).toFixed(1)) : 0
  return {
    id: String(menuItem._id),
    restaurantId: String(menuItem.restaurantId),
    name: menuItem.name,
    description: menuItem.description,
    price: menuItem.price,
    category: menuItem.category,
    image: menuItem.image ?? null,
    isAvailable: menuItem.isAvailable ?? true,
    ingredients: menuItem.ingredients,
    preparationTimeMinutes: menuItem.preparationTimeMinutes,
    nutrition: menuItem.nutrition ?? null,
    rating,
    reviewsCount,
    isPopular: menuItem.isPopular ?? false,
  }
}

function parseObjectId(value: string): Types.ObjectId | undefined {
  return /^[a-f\d]{24}$/i.test(value) ? new Types.ObjectId(value) : undefined
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function restaurantNotFound(): AppException {
  return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NotFound, 'Restaurant not found')
}

function menuItemNotFound(): AppException {
  return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NotFound, 'Menu item not found')
}
