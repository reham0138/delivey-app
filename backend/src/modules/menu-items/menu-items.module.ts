import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MenuItemsController } from './menu-items.controller'
import { MenuItemsService } from './menu-items.service'
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema'
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema'
import { Category, CategorySchema } from '../categories/schemas/category.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [MenuItemsController],
  providers: [MenuItemsService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
