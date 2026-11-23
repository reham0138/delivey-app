import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../common/enums'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { CancelOrderDto, UpdateOrderStatusDto } from './dto/order-actions.dto'
import { AdminOrderQueryDto, OrderQueryDto } from './dto/order-query.dto'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrdersService } from './orders.service'

@ApiTags('orders')
@ApiBearerAuth('bearer')
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('orders/quote')
  @Roles(Role.Customer)
  quote(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.quote(dto)
  }

  @Post('orders')
  @Roles(Role.Customer)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user, dto)
  }

  @Get('orders')
  @Roles(Role.Customer)
  findOwn(@CurrentUser() user: AuthUser, @Query() query: OrderQueryDto) {
    return this.ordersService.findOwn(user.id, query)
  }

  @Get('orders/:id')
  @Roles(Role.Customer)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.findOneForCustomer(user.id, id)
  }

  @Post('orders/:id/cancel')
  @Roles(Role.Customer)
  cancelOwn(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.ordersService.cancelForCustomer(user.id, id, dto.reason)
  }

  @Get('restaurant/orders')
  @Roles(Role.Restaurant)
  findForRestaurant(@CurrentUser() user: AuthUser, @Query() query: OrderQueryDto) {
    return this.ordersService.findForRestaurant(user.id, query)
  }

  @Get('restaurant/orders/:id')
  @Roles(Role.Restaurant)
  findOneForRestaurant(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.findOneForRestaurant(user.id, id)
  }

  @Patch('restaurant/orders/:id/status')
  @Roles(Role.Restaurant)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatusForRestaurant(user.id, id, dto.status)
  }

  @Post('restaurant/orders/:id/cancel')
  @Roles(Role.Restaurant)
  cancelForRestaurant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelForRestaurant(user.id, id, dto.reason)
  }

  @Get('admin/orders')
  @Roles(Role.Admin)
  findForAdmin(@Query() query: AdminOrderQueryDto) {
    return this.ordersService.findForAdmin(query)
  }

  @Get('admin/orders/:id')
  @Roles(Role.Admin)
  findOneForAdmin(@Param('id') id: string) {
    return this.ordersService.findOneForAdmin(id)
  }

  @Post('admin/orders/:id/cancel')
  @Roles(Role.Admin)
  cancelForAdmin(@Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.ordersService.cancelForAdmin(id, dto.reason)
  }
}
