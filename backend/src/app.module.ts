import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { validateEnv } from './config/env.validation'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './modules/health/health.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { CategoriesModule } from './modules/categories/categories.module'
import { RestaurantsModule } from './modules/restaurants/restaurants.module'
import { MenuItemsModule } from './modules/menu-items/menu-items.module'
import { OrdersModule } from './modules/orders/orders.module'
import { ReviewsModule } from './modules/reviews/reviews.module'
import { AdminModule } from './modules/admin/admin.module'
import { UploadsModule } from './modules/uploads/uploads.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Registered for later use on auth routes only (10 req/min per IP).
    // No APP_GUARD is registered, so nothing is throttled globally.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    RestaurantsModule,
    MenuItemsModule,
    OrdersModule,
    ReviewsModule,
    AdminModule,
    UploadsModule,
  ],
})
export class AppModule {}
