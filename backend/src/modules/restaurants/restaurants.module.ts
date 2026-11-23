import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { RestaurantsController } from './restaurants.controller'
import { RestaurantsService } from './restaurants.service'
import { Restaurant, RestaurantSchema } from './schemas/restaurant.schema'
import { User, UserSchema } from '../users/schemas/user.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService, MongooseModule],
})
export class RestaurantsModule {}
