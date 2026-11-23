import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { AuthService } from './auth.service'
import { LoginDto, LogoutDto, RefreshDto, RegisterDto } from './dto/auth.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 10 requests/minute per IP on the credential endpoints (contract section 4).
  // ThrottlerGuard is applied per-method so nothing else is rate limited.
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto)
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto)
  }

  @Post('logout-all')
  @HttpCode(204)
  logoutAll(@CurrentUser() user: AuthUser) {
    return this.authService.logoutAll(user.id)
  }

  @Get('me')
  @ApiBearerAuth('bearer')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.withRestaurantId(user)
  }
}
