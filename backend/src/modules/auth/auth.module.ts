import { Module } from '@nestjs/common'
import type { StringValue } from 'ms'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { UsersModule } from '../users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RolesGuard } from './guards/roles.guard'
import { Session, SessionSchema } from './schemas/session.schema'
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema'
import { User, UserSchema } from '../users/schemas/user.schema'

@Module({
  imports: [
    UsersModule,
    // Restaurant/User models are registered directly (not via their modules)
    // so auth never imports RestaurantsModule — no circular dependency.
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_TTL') ?? '15m') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Global guards — registered here so their dependencies (JwtService,
    // UsersService) resolve in this module's injector.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
