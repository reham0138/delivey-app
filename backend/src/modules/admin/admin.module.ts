import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '../auth/auth.module'
import { Order, OrderSchema } from '../orders/schemas/order.schema'
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema'
import { Review, ReviewSchema } from '../reviews/schemas/review.schema'
import { User, UserSchema } from '../users/schemas/user.schema'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { AdminStatsService } from './admin-stats.service'

@Module({
  imports: [
    // AuthModule exports AuthService (revokeAllSessions). AuthModule never
    // imports AdminModule, so there is no circular dependency.
    AuthModule,
    // Models are registered directly (read-only) instead of importing the
    // owning modules, matching the orders/reviews module pattern.
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminStatsService],
})
export class AdminModule {}
