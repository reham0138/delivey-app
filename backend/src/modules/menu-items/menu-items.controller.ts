import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../common/enums'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import {
  ListAdminMenuItemsQueryDto,
  ListMenuItemsQueryDto,
  ListOwnerMenuItemsQueryDto,
  RestaurantMenuItemsQueryDto,
} from './dto/list-menu-items-query.dto'
import {
  CreateMenuItemDto,
  UpdateMenuItemAvailabilityDto,
  UpdateMenuItemDto,
} from './dto/menu-item.dto'
import { MenuItemsService } from './menu-items.service'

@ApiTags('menu-items')
@ApiBearerAuth('bearer')
@Controller()
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Public()
  @Get('restaurants/:restaurantId/menu-items')
  findForRestaurant(
    @Param('restaurantId') restaurantId: string,
    @Query() query: RestaurantMenuItemsQueryDto,
  ) {
    return this.menuItemsService.findForRestaurant(restaurantId, query)
  }

  @Public()
  @Get('menu-items')
  findAll(@Query() query: ListMenuItemsQueryDto) {
    return this.menuItemsService.findAll(query)
  }

  @Public()
  @Get('menu-items/:id')
  findOne(@Param('id') id: string) {
    return this.menuItemsService.findOne(id)
  }

  @Roles(Role.Restaurant)
  @Get('restaurant/menu-items')
  findMine(@CurrentUser() user: AuthUser, @Query() query: ListOwnerMenuItemsQueryDto) {
    return this.menuItemsService.findMine(user, query)
  }

  @Roles(Role.Restaurant)
  @Post('restaurant/menu-items')
  createMine(@CurrentUser() user: AuthUser, @Body() dto: CreateMenuItemDto) {
    return this.menuItemsService.createMine(user, dto)
  }

  @Roles(Role.Restaurant)
  @Patch('restaurant/menu-items/:id')
  updateMine(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuItemsService.updateMine(user, id, dto)
  }

  @Roles(Role.Restaurant)
  @Delete('restaurant/menu-items/:id')
  @HttpCode(204)
  deleteMine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.menuItemsService.deleteMine(user, id)
  }

  @Roles(Role.Admin)
  @Get('admin/menu-items')
  findAdmin(@Query() query: ListAdminMenuItemsQueryDto) {
    return this.menuItemsService.findAdmin(query)
  }

  @Roles(Role.Admin)
  @Patch('admin/menu-items/:id/availability')
  updateAvailability(@Param('id') id: string, @Body() dto: UpdateMenuItemAvailabilityDto) {
    return this.menuItemsService.updateAvailability(id, dto)
  }
}
