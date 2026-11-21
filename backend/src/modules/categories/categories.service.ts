import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import type { PipelineStage } from 'mongoose'
import { AppException } from '../../common/errors'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import { paginate } from '../../common/utils/pagination.util'
import { Category, CategoryDocument } from './schemas/category.schema'
import { MenuItem } from '../menu-items/schemas/menu-item.schema'
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto'
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto'

interface CategoryRow {
  _id: Types.ObjectId
  name: string
  isActive: boolean
  itemsCount: number
}

export interface CategoryResponse {
  id: string
  name: string
  isActive: boolean
  itemsCount: number
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 11000
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(MenuItem.name) private readonly menuItemModel: Model<MenuItem>,
  ) {}

  async findAll(query: ListCategoriesQueryDto) {
    return this.list(query, { isActive: true })
  }

  async findAdmin(query: ListCategoriesQueryDto) {
    return this.list(query, {})
  }

  async create(dto: CreateCategoryDto): Promise<CategoryResponse> {
    const name = this.normalizeName(dto.name)
    let category: CategoryDocument
    try {
      category = await this.categoryModel.create({
        name,
        isActive: dto.isActive ?? true,
      })
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppException(409, ErrorCode.CategoryNameTaken, 'Category name already exists')
      }
      throw error
    }
    return this.findAdminOne(String(category._id))
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    const category = await this.requireById(id)
    if (dto.name !== undefined) category.name = this.normalizeName(dto.name)
    if (dto.isActive !== undefined) category.isActive = dto.isActive
    try {
      await category.save()
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppException(409, ErrorCode.CategoryNameTaken, 'Category name already exists')
      }
      throw error
    }
    return this.findAdminOne(String(category._id))
  }

  private async list(query: ListCategoriesQueryDto, filter: Record<string, boolean>) {
    const [total, rows] = await Promise.all([
      this.categoryModel.countDocuments(filter),
      this.categoryModel.aggregate<CategoryRow>([
        { $match: filter },
        { $sort: { name: 1 } },
        ...this.itemsCountLookup(),
        { $skip: (query.page - 1) * query.limit },
        { $limit: query.limit },
      ]),
    ])

    return paginate(
      rows.map((row) => this.toResponse(row)),
      total,
      query,
    )
  }

  private async findAdminOne(id: string): Promise<CategoryResponse> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(404, ErrorCode.NotFound, 'Category not found')
    }
    const [row] = await this.categoryModel.aggregate<CategoryRow>([
      { $match: { _id: new Types.ObjectId(id) } },
      ...this.itemsCountLookup(),
    ])
    if (!row) throw new AppException(404, ErrorCode.NotFound, 'Category not found')
    return this.toResponse(row)
  }

  private async requireById(id: string): Promise<CategoryDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(404, ErrorCode.NotFound, 'Category not found')
    }
    const category = await this.categoryModel.findById(id).exec()
    if (!category) throw new AppException(404, ErrorCode.NotFound, 'Category not found')
    return category
  }

  private itemsCountLookup(): PipelineStage[] {
    return [
      {
        $lookup: {
          from: this.menuItemModel.collection.name,
          let: { categoryId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$categoryId', '$$categoryId'] },
                isActive: true,
              },
            },
            { $count: 'count' },
          ],
          as: 'itemCounts',
        },
      },
      {
        $project: {
          name: 1,
          isActive: 1,
          itemsCount: { $ifNull: [{ $arrayElemAt: ['$itemCounts.count', 0] }, 0] },
        },
      },
    ]
  }

  private toResponse(row: CategoryRow): CategoryResponse {
    return {
      id: row._id.toString(),
      name: row.name,
      isActive: row.isActive,
      itemsCount: row.itemsCount,
    }
  }

  private normalizeName(name: string): string {
    const normalized = name.trim()
    if (!normalized) {
      throw new AppException(400, ErrorCode.ValidationError, 'Category name must not be empty', [
        { field: 'name', message: 'must not be empty' },
      ])
    }
    return normalized
  }
}
