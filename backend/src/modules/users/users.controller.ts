import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { Role } from '../../common/enums'
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UsersService } from './users.service'

@ApiTags('users')
@ApiBearerAuth('bearer')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto)
  }

  @Get('me/addresses')
  @Roles(Role.Customer)
  listAddresses(@CurrentUser() user: AuthUser) {
    return this.usersService.listAddresses(user.id)
  }

  @Post('me/addresses')
  @Roles(Role.Customer)
  addAddress(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.usersService.addAddress(user.id, dto)
  }

  @Patch('me/addresses/:id')
  @Roles(Role.Customer)
  updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, id, dto)
  }

  @Delete('me/addresses/:id')
  @Roles(Role.Customer)
  @HttpCode(204)
  deleteAddress(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.deleteAddress(user.id, id)
  }
}
