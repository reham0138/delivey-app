import 'dotenv/config'
import mongoose from 'mongoose'
import { MenuItem, MenuItemSchema } from '../modules/menu-items/schemas/menu-item.schema'
import { Restaurant, RestaurantSchema } from '../modules/restaurants/schemas/restaurant.schema'
import { Review, ReviewSchema } from '../modules/reviews/schemas/review.schema'

// Recomputes ratingSum/ratingCount on every menu item and restaurant from the
// reviews collection (contract section 9.5). Hidden reviews do not count;
// reported reviews still do. Run with `npm run ratings:reconcile`.
async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI must be set in .env')

  await mongoose.connect(uri)
  try {
    const reviewModel = mongoose.model(Review.name, ReviewSchema)
    const menuItemModel = mongoose.model(MenuItem.name, MenuItemSchema)
    const restaurantModel = mongoose.model(Restaurant.name, RestaurantSchema)

    const visible = { isHidden: { $ne: true } }
    const [itemStats, restaurantStats, visibleCount] = await Promise.all([
      reviewModel
        .aggregate<{ _id: mongoose.Types.ObjectId; ratingSum: number; ratingCount: number }>([
          { $match: visible },
          {
            $group: {
              _id: '$menuItemId',
              ratingSum: { $sum: '$rating' },
              ratingCount: { $sum: 1 },
            },
          },
        ])
        .exec(),
      reviewModel
        .aggregate<{ _id: mongoose.Types.ObjectId; ratingSum: number; ratingCount: number }>([
          { $match: visible },
          {
            $group: {
              _id: '$restaurantId',
              ratingSum: { $sum: '$rating' },
              ratingCount: { $sum: 1 },
            },
          },
        ])
        .exec(),
      reviewModel.countDocuments(visible).exec(),
    ])

    const itemRatings = new Map(itemStats.map((stat) => [String(stat._id), stat]))
    const restaurantRatings = new Map(restaurantStats.map((stat) => [String(stat._id), stat]))

    const [menuItems, restaurants] = await Promise.all([
      menuItemModel.find({}).select('_id').lean().exec(),
      restaurantModel.find({}).select('_id').lean().exec(),
    ])

    const countersFor = (
      ratings: Map<string, { ratingSum: number; ratingCount: number }>,
      id: unknown,
    ) => {
      const stat = ratings.get(String(id))
      return { ratingSum: stat?.ratingSum ?? 0, ratingCount: stat?.ratingCount ?? 0 }
    }

    await menuItemModel.bulkWrite(
      menuItems.map((item) => ({
        updateOne: {
          filter: { _id: item._id },
          update: { $set: countersFor(itemRatings, item._id) },
        },
      })),
      { ordered: true },
    )
    await restaurantModel.bulkWrite(
      restaurants.map((restaurant) => ({
        updateOne: {
          filter: { _id: restaurant._id },
          update: { $set: countersFor(restaurantRatings, restaurant._id) },
        },
      })),
      { ordered: true },
    )

    console.log(
      `Reconciled rating counters from ${visibleCount} visible reviews: ${menuItems.length} menu items, ${restaurants.length} restaurants.`,
    )
  } finally {
    await mongoose.disconnect()
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
