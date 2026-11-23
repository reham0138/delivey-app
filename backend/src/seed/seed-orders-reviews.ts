import 'dotenv/config'
import mongoose from 'mongoose'
// Registers the global schema defaults (timestamps, id virtual) before any
// schema module below is evaluated, so bulkWrite keeps createdAt/updatedAt.
import '../database/mongoose.plugin'
import { Category, CategorySchema } from '../modules/categories/schemas/category.schema'
import { MenuItem, MenuItemSchema } from '../modules/menu-items/schemas/menu-item.schema'
import { Order, OrderSchema } from '../modules/orders/schemas/order.schema'
import { Restaurant, RestaurantSchema } from '../modules/restaurants/schemas/restaurant.schema'
import { Review, ReviewSchema } from '../modules/reviews/schemas/review.schema'
import { User, UserSchema } from '../modules/users/schemas/user.schema'
import { seedCatalogCollections } from './catalog-seed'
import { OrdersReviewsModels, seedOrdersReviews } from './orders-reviews-seed'
import { seedUsers } from './users-seed'

// Standalone dev seed: users -> catalog -> orders/reviews, mirroring the master
// seed runner. Idempotent: deterministic fixture ObjectIds + replaceOne upserts.
async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI must be set in .env')

  await mongoose.connect(uri)
  try {
    const usersResult = await seedUsers({
      users: mongoose.model(User.name, UserSchema),
    })
    const catalog = await seedCatalogCollections(
      {
        categories: mongoose.model(Category.name, CategorySchema),
        restaurants: mongoose.model(Restaurant.name, RestaurantSchema),
        menuItems: mongoose.model(MenuItem.name, MenuItemSchema),
      },
      usersResult.ids,
    )
    const models: OrdersReviewsModels = {
      orders: mongoose.model(Order.name, OrderSchema),
      reviews: mongoose.model(Review.name, ReviewSchema),
      menuItems: mongoose.model(MenuItem.name, MenuItemSchema),
      restaurants: mongoose.model(Restaurant.name, RestaurantSchema),
    }
    const result = await seedOrdersReviews(models, {
      users: usersResult.ids,
      restaurants: catalog.ids.restaurants,
      menuItems: catalog.ids.menuItems,
    })

    console.log(
      `Users: ${usersResult.created} created. Catalog: ${catalog.created.categories} categories, ${catalog.created.restaurants} restaurants, ${catalog.created.menuItems} menu items.`,
    )
    console.log(
      `Orders: ${result.created.orders} created. Reviews: ${result.created.reviews} created. Rating counters updated on ${result.created.ratingCounters} documents.`,
    )
  } finally {
    await mongoose.disconnect()
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
