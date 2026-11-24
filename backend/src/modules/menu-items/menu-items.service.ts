import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import type { PipelineStage } from 'mongoose'
import { AppException } from '../../common/errors'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { paginate } from '../../common/utils/pagination.util'
import { Category, CategoryDocument } from '../categories/schemas/category.schema'
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema'
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema'
import {
  ListAdminMenuItemsQueryDto,
  ListMenuItemsQueryDto,
  ListOwnerMenuItemsQueryDto,
  RestaurantMenuItemsQueryDto,
} from './dto/list-menu-items-query.dto'
import {
  CreateMenuItemDto,
  UpdateMenuItemAvailabilityDto,
  UpdateMenuItemDto,
} from './dto/menu-item.dto'

export interface MenuItemRow {
  _id: Types.ObjectId
  restaurantId: Types.ObjectId
  name: string
  description: string
  price: number
  image: string | null
  isAvailable: boolean
  ingredients: string[]
  preparationTimeMinutes: number
  nutrition: MenuItem['nutrition']
  isPopular: boolean
  ratingSum?: number
  ratingCount?: number
  categoryName: string
  restaurantName?: string
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function mapMenuItem(row: MenuItemRow): MenuItemResponse {
  const count = row.ratingCount ?? 0
  return {
    id: String(row._id),
    restaurantId: String(row.restaurantId),
    name: row.name,
    description: row.description,
    price: row.price,
    category: row.categoryName,
    image: row.image ?? null,
    isAvailable: row.isAvailable,
    ingredients: row.ingredients,
    preparationTimeMinutes: row.preparationTimeMinutes,
    nutrition: row.nutrition,
    rating: count === 0 ? 0 : Math.round(((row.ratingSum ?? 0) / count) * 10) / 10,
    reviewsCount: count,
    isPopular: row.isPopular,
  }
}

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel(MenuItem.name) private readonly menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Restaurant.name) private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async findForRestaurant(restaurantId: string, query: RestaurantMenuItemsQueryDto) {
    await this.requireActiveRestaurant(restaurantId)
    const match: Record<string, unknown> = {
      restaurantId: new Types.ObjectId(restaurantId),
      isActive: true,
    }
    if (query.includeUnavailable !== 'true') match.isAvailable = true
    const base = this.publicPipeline(match, query.search, query.category)
    return this.runPublicList(base, query, query.sort)
  }

  async findAll(query: ListMenuItemsQueryDto) {
    const match: Record<string, unknown> = { isActive: true }
    if (query.restaurantId) match.restaurantId = new Types.ObjectId(query.restaurantId)
    if (query.includeUnavailable !== 'true') match.isAvailable = true
    if (query.isPopular !== undefined) match.isPopular = query.isPopular === 'true'

    const minPrice = query.minPrice === undefined ? undefined : Number(query.minPrice)
    const maxPrice = query.maxPrice === undefined ? undefined : Number(query.maxPrice)
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new AppException(400, ErrorCode.ValidationError, 'minPrice must not exceed maxPrice', [
        { field: 'minPrice', message: 'must not exceed maxPrice' },
      ])
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      match.price = {
        ...(minPrice === undefined ? {} : { $gte: minPrice }),
        ...(maxPrice === undefined ? {} : { $lte: maxPrice }),
      }
    }

    const base = this.publicPipeline(match, query.search, query.category, query.openOnly === 'true')
    return this.runPublicList(base, query, query.sort)
  }

  async findOne(id: string): Promise<MenuItemResponse> {
    const itemId = this.objectId(id, 'Menu item not found')
    const rows = await this.menuItemModel.aggregate<MenuItemRow>([
      ...this.publicPipeline({ _id: itemId, isActive: true }, undefined, undefined),
      ...this.ratingStage(),
      { $limit: 1 },
      ...this.menuProjection(),
    ])
    if (!rows[0]) throw new AppException(404, ErrorCode.NotFound, 'Menu item not found')
    return mapMenuItem(rows[0])
  }

  async findMine(user: AuthUser, query: ListOwnerMenuItemsQueryDto) {
    const restaurantId = await this.ownerRestaurantId(user)
    const match: Record<string, unknown> = { restaurantId, isActive: true }
    if (query.isAvailable !== undefined) match.isAvailable = query.isAvailable === 'true'
    const base: PipelineStage[] = [{ $match: match }, ...this.categoryLookup(query.category, false)]
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i')
      base.push({ $match: { $or: [{ name: regex }, { description: regex }] } })
    }
    return this.runList(base, query)
  }

  async createMine(user: AuthUser, dto: CreateMenuItemDto): Promise<MenuItemResponse> {
    const restaurantId = await this.ownerRestaurantId(user)
    const categoryId = await this.activeCategoryId(dto.category)
    const item = await this.menuItemModel.create({
      restaurantId,
      name: dto.name.trim(),
      description: dto.description.trim(),
      price: dto.price,
      categoryId,
      image: dto.image?.trim() || null,
      ingredients: dto.ingredients.map((ingredient) => ingredient.trim()),
      preparationTimeMinutes: dto.preparationTimeMinutes,
      nutrition: dto.nutrition ?? null,
      isAvailable: dto.isAvailable ?? true,
      isPopular: dto.isPopular ?? false,
    })
    return this.requireItemResponse(item._id, restaurantId)
  }

  async updateMine(user: AuthUser, id: string, dto: UpdateMenuItemDto): Promise<MenuItemResponse> {
    const restaurantId = await this.ownerRestaurantId(user)
    const itemId = this.objectId(id, 'Menu item not found')
    const item = await this.menuItemModel
      .findOne({ _id: itemId, restaurantId, isActive: true })
      .select('+isActive +categoryId +ratingSum +ratingCount')
      .exec()
    if (!item) throw new AppException(404, ErrorCode.NotFound, 'Menu item not found')

    if (dto.name !== undefined) item.name = dto.name.trim()
    if (dto.description !== undefined) item.description = dto.description.trim()
    if (dto.price !== undefined) item.price = dto.price
    if (dto.category !== undefined) item.categoryId = await this.activeCategoryId(dto.category)
    if (dto.image !== undefined) item.image = dto.image?.trim() || null
    if (dto.ingredients !== undefined) {
      item.ingredients = dto.ingredients.map((ingredient) => ingredient.trim())
    }
    if (dto.preparationTimeMinutes !== undefined) {
      item.preparationTimeMinutes = dto.preparationTimeMinutes
    }
    if (dto.nutrition !== undefined) item.nutrition = dto.nutrition
    if (dto.isAvailable !== undefined) item.isAvailable = dto.isAvailable
    if (dto.isPopular !== undefined) item.isPopular = dto.isPopular
    await item.save()
    return this.requireItemResponse(itemId, restaurantId)
  }

  async deleteMine(user: AuthUser, id: string): Promise<void> {
    const restaurantId = await this.ownerRestaurantId(user)
    const itemId = this.objectId(id, 'Menu item not found')
    const result = await this.menuItemModel.updateOne(
      { _id: itemId, restaurantId, isActive: true },
      { $set: { isActive: false } },
    )
    if (result.matchedCount === 0) {
      throw new AppException(404, ErrorCode.NotFound, 'Menu item not found')
    }
  }

  async findAdmin(query: ListAdminMenuItemsQueryDto) {
    const match: Record<string, unknown> = { isActive: true }
    if (query.restaurantId) match.restaurantId = new Types.ObjectId(query.restaurantId)
    if (query.isAvailable !== undefined) match.isAvailable = query.isAvailable === 'true'
    const base: PipelineStage[] = [
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
    ]
    base.push(...this.categoryLookup(undefined, false))
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i')
      base.push({
        $match: {
          $or: [
            { name: regex },
            { 'restaurant.name': regex },
            { 'category.name': regex },
          ],
        },
      })
    }
    return this.runList(base, query, 'name', true)
  }

  async updateAvailability(id: string, dto: UpdateMenuItemAvailabilityDto) {
    const itemId = this.objectId(id, 'Menu item not found')
    const result = await this.menuItemModel.updateOne(
      { _id: itemId, isActive: true },
      { $set: { isAvailable: dto.isAvailable } },
    )
    if (result.matchedCount === 0) {
      throw new AppException(404, ErrorCode.NotFound, 'Menu item not found')
    }
    const rows = await this.menuItemModel.aggregate<MenuItemRow>([
      ...this.adminItemPipeline({ _id: itemId, isActive: true }),
      { $limit: 1 },
    ])
    if (!rows[0]) throw new AppException(404, ErrorCode.NotFound, 'Menu item not found')
    return { ...mapMenuItem(rows[0]), restaurantName: rows[0].restaurantName ?? '' }
  }

  private runPublicList(
    pipeline: PipelineStage[],
    query: ListMenuItemsQueryDto | RestaurantMenuItemsQueryDto,
    sort: ListMenuItemsQueryDto['sort'] = 'name',
  ) {
    return this.runList([...pipeline, ...this.ratingStage()], query, sort)
  }

  private async runList(
    pipeline: PipelineStage[],
    query: { page: number; limit: number },
    sort: ListMenuItemsQueryDto['sort'] | 'name' = 'name',
    includeRestaurantName = false,
  ) {
    const sortStage: Record<string, 1 | -1> =
      sort === 'rating'
        ? { rating: -1, name: 1 }
        : sort === 'popular'
          ? { isPopular: -1, rating: -1, name: 1 }
        : sort === 'price_asc'
          ? { price: 1, name: 1 }
          : sort === 'price_desc'
            ? { price: -1, name: 1 }
            : { name: 1 }
    const [countRows, rows] = await Promise.all([
      this.menuItemModel.aggregate<{ total: number }>([...pipeline, { $count: 'total' }]),
      this.menuItemModel.aggregate<MenuItemRow>([
        ...pipeline,
        { $sort: sortStage },
        { $skip: (query.page - 1) * query.limit },
        { $limit: query.limit },
        ...this.menuProjection(includeRestaurantName),
      ]),
    ])
    const data = rows.map((row) => ({
      ...mapMenuItem(row),
      ...(includeRestaurantName ? { restaurantName: row.restaurantName ?? '' } : {}),
    }))
    return paginate(data, countRows[0]?.total ?? 0, query)
  }

  private publicPipeline(
    match: Record<string, unknown>,
    search?: string,
    category?: string,
    openOnly = false,
  ): PipelineStage[] {
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
        $match: openOnly
          ? { 'restaurant.isActive': true, 'restaurant.isOpen': true }
          : { 'restaurant.isActive': true },
      },
      ...this.categoryLookup(category),
    ]
    if (search) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i')
      pipeline.push({
        $match: { $or: [{ name: regex }, { description: regex }, { 'category.name': regex }] },
      })
    }
    return pipeline
  }

  private categoryLookup(category?: string, activeOnly = true): PipelineStage[] {
    const pipeline: PipelineStage[] = [
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
    if (activeOnly) pipeline.push({ $match: { 'category.isActive': true } })
    if (category) {
      pipeline.push({
        $match: {
          'category.name': {
            $regex: `^${escapeRegex(category.trim())}$`,
            $options: 'i',
          },
        },
      })
    }
    return pipeline
  }

  private ratingStage(): PipelineStage[] {
    return [
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
    ]
  }

  private menuProjection(includeRestaurantName = false): PipelineStage[] {
    return [
      {
        $project: {
          restaurantId: 1,
          name: 1,
          description: 1,
          price: 1,
          image: 1,
          isAvailable: 1,
          ingredients: 1,
          preparationTimeMinutes: 1,
          nutrition: 1,
          isPopular: 1,
          ratingSum: 1,
          ratingCount: 1,
          categoryName: '$category.name',
          ...(includeRestaurantName ? { restaurantName: '$restaurant.name' } : {}),
        },
      },
    ]
  }

  private adminItemPipeline(match: Record<string, unknown>): PipelineStage[] {
    return [
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
      ...this.categoryLookup(undefined, false),
      ...this.ratingStage(),
      ...this.menuProjection(true),
    ]
  }

  private async requireItemResponse(
    itemId: Types.ObjectId,
    restaurantId: Types.ObjectId,
  ): Promise<MenuItemResponse> {
    const rows = await this.menuItemModel.aggregate<MenuItemRow>([
      { $match: { _id: itemId, restaurantId, isActive: true } },
      ...this.categoryLookup(undefined, false),
      ...this.ratingStage(),
      { $limit: 1 },
      ...this.menuProjection(),
    ])
    if (!rows[0]) throw new AppException(404, ErrorCode.NotFound, 'Menu item not found')
    return mapMenuItem(rows[0])
  }

  private async ownerRestaurantId(user: AuthUser): Promise<Types.ObjectId> {
    const restaurant = await this.restaurantModel
      .findOne({ ownerId: user.id })
      .select('_id')
      .exec()
    if (!restaurant) throw new AppException(404, ErrorCode.NotFound, 'Restaurant not found')
    return restaurant._id
  }

  private async requireActiveRestaurant(id: string): Promise<void> {
    const restaurantId = this.objectId(id, 'Restaurant not found')
    const exists = await this.restaurantModel.exists({ _id: restaurantId, isActive: true })
    if (!exists) throw new AppException(404, ErrorCode.NotFound, 'Restaurant not found')
  }

  private async activeCategoryId(name: string): Promise<Types.ObjectId> {
    const category = await this.categoryModel
      .findOne({ name: name.trim(), isActive: true })
      .collation({ locale: 'en', strength: 2 })
      .select('_id')
      .exec()
    if (!category) {
      throw new AppException(
        400,
        ErrorCode.ValidationError,
        'Category must match an active category',
        [{ field: 'category', message: 'must match an active category' }],
      )
    }
    return category._id
  }

  private objectId(id: string, message: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new AppException(404, ErrorCode.NotFound, message)
    return new Types.ObjectId(id)
  }
}
