import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { Role } from '../../common/enums'
import { AdminService } from './admin.service'
import { AdminStatsService } from './admin-stats.service'
import { AdminUsersQueryDto } from './dto/admin-users-query.dto'
import { UpdateUserStatusDto } from './dto/update-user-status.dto'

@ApiTags('admin')
@ApiBearerAuth('bearer')
@Controller('admin')
@Roles(Role.Admin)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminStatsService: AdminStatsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide statistics for the admin overview' })
  stats() {
    return this.adminStatsService.getStats()
  }

  @Get('users')
  @ApiOperation({ summary: 'List users with search, role and status filters' })
  findAllUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.findAllUsers(query)
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Suspend or reactivate a user account' })
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateUserStatus(id, dto.status, user)
  }
}
