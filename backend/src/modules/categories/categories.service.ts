import { InjectModel } from '@nestjs/mongoose'
import { Injectable } from '@nestjs/common'
import { Types, type Model } from 'mongoose'
import { paginate } from '../../common/utils/pagination.util'
import { Category } from './schemas/category.schema'
import { MenuItem } from '../menu-items/schemas/menu-item.schema'
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto'

interface CategoryItemCount {
  _id: Types.ObjectId
  itemsCount: number
}

export interface CategoryResponse {
  id: string
  name: string
  isActive: boolean
  itemsCount: number
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    @InjectModel(MenuItem.name) private readonly menuItemModel: Model<MenuItem>,
  ) {}

  async findAll(query: ListCategoriesQueryDto) {
    const filter = { isActive: true }
    const skip = (query.page - 1) * query.limit
    const [categories, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ name: 1, _id: 1 })
        .skip(skip)
        .limit(query.limit)
        .lean()
        .exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ])

    const categoryIds = categories.map((category) => category._id)
    const itemCounts = categoryIds.length
      ? await this.menuItemModel
          .aggregate<CategoryItemCount>([
            { $match: { isActive: true, categoryId: { $in: categoryIds } } },
            { $group: { _id: '$categoryId', itemsCount: { $sum: 1 } } },
          ])
          .exec()
      : []
    const itemCountsByCategory = new Map(
      itemCounts.map(({ _id, itemsCount }) => [String(_id), itemsCount]),
    )
    const data: CategoryResponse[] = categories.map((category) => ({
      id: String(category._id),
      name: category.name,
      isActive: category.isActive,
      itemsCount: itemCountsByCategory.get(String(category._id)) ?? 0,
    }))

    return paginate(data, total, query)
  }
}
