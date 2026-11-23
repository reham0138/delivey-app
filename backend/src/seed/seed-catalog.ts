import 'dotenv/config'
import mongoose from 'mongoose'
import { Category, CategorySchema } from '../modules/categories/schemas/category.schema'
import { MenuItem, MenuItemSchema } from '../modules/menu-items/schemas/menu-item.schema'
import { Restaurant, RestaurantSchema } from '../modules/restaurants/schemas/restaurant.schema'
import { CatalogModels, seedCatalogCollections } from './catalog-seed'

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI must be set in .env')

  await mongoose.connect(uri)
  try {
    const models: CatalogModels = {
      categories: mongoose.model(Category.name, CategorySchema),
      restaurants: mongoose.model(Restaurant.name, RestaurantSchema),
      menuItems: mongoose.model(MenuItem.name, MenuItemSchema),
    }
    const result = await seedCatalogCollections(models)

    console.log(
      `Created ${result.created.categories} categories, ${result.created.restaurants} restaurants, and ${result.created.menuItems} menu items.`,
    )
    console.warn(
      'No users map was supplied; restaurants and menu items were skipped. Pass the users map to seedCatalogCollections from the master seed runner to seed them.',
    )
  } finally {
    await mongoose.disconnect()
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
