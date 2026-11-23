import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Order, OrderSchema } from './schemas/order.schema'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema'
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
