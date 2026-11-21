import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../common/enums'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import {
  ListAdminRestaurantsQueryDto,
  ListRestaurantsQueryDto,
  UpdateRestaurantDto,
  UpdateRestaurantStatusDto,
} from './dto/list-restaurants-query.dto'
import { RestaurantsService } from './restaurants.service'

@ApiTags('restaurants')
@ApiBearerAuth('bearer')
@Controller()
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Public()
  @Get('restaurants')
  findAll(@Query() query: ListRestaurantsQueryDto) {
    return this.restaurantsService.findAll(query)
  }

  @Public()
  @Get('restaurants/:id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id)
  }

  @Roles(Role.Restaurant)
  @Get('restaurant/me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.restaurantsService.findMine(user)
  }

  @Roles(Role.Restaurant)
  @Patch('restaurant/me')
  updateMine(@CurrentUser() user: AuthUser, @Body() dto: UpdateRestaurantDto) {
    return this.restaurantsService.updateMine(user, dto)
  }

  @Roles(Role.Admin)
  @Get('admin/restaurants')
  findAdmin(@Query() query: ListAdminRestaurantsQueryDto) {
    return this.restaurantsService.findAdmin(query)
  }

  @Roles(Role.Admin)
  @Patch('admin/restaurants/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateRestaurantStatusDto) {
    return this.restaurantsService.updateStatus(id, dto)
  }
}
