import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { ListMenuItemsQueryDto, RestaurantMenuItemsQueryDto } from './dto/list-menu-items-query.dto'
import { MenuItemsService } from './menu-items.service'

@ApiTags('menu-items')
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
}
