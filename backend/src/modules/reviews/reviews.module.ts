import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Review, ReviewSchema } from './schemas/review.schema'
import { ReviewsController } from './reviews.controller'
import { ReviewsService } from './reviews.service'
import { Order, OrderSchema } from '../orders/schemas/order.schema'
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema'
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Order.name, schema: OrderSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
