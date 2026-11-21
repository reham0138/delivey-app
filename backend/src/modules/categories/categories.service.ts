import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { paginate } from '../../common/utils/pagination.util'
import { Category, CategoryDocument } from './schemas/category.schema'
import { MenuItem } from '../menu-items/schemas/menu-item.schema'
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto'

interface CategoryRow {
  _id: { toString(): string }
  name: string
  isActive: boolean
  itemsCount: number
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(MenuItem.name) private readonly menuItemModel: Model<MenuItem>,
  ) {}

  async findAll(query: ListCategoriesQueryDto) {
    const filter = { isActive: true }
    const [total, rows] = await Promise.all([
      this.categoryModel.countDocuments(filter),
      this.categoryModel.aggregate<CategoryRow>([
        { $match: filter },
        { $sort: { name: 1 } },
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
        { $skip: (query.page - 1) * query.limit },
        { $limit: query.limit },
      ]),
    ])

    return paginate(
      rows.map((row) => ({
        id: row._id.toString(),
        name: row.name,
        isActive: row.isActive,
        itemsCount: row.itemsCount,
      })),
      total,
      query,
    )
  }
}
