import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { TokenExpiredError } from 'jsonwebtoken'
import { Request } from 'express'
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator'
import { AccountStatus } from '../../../common/enums'
import { AppException } from '../../../common/errors'
import { ErrorCode } from '../../../common/errors/error-codes.enum'
import type { AuthUser } from '../../../common/interfaces/auth-user.interface'
import { UsersService } from '../../users/users.service'

interface AccessTokenPayload {
  sub: string
  role: string
}

/**
 * Global guard: verifies the Bearer JWT, reloads the user from the DB on
 * every request (so suspensions take effect immediately) and attaches the
 * AuthUser to request.user for @CurrentUser().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>()
    const token = this.extractToken(request)
    if (!token) {
      throw new AppException(401, ErrorCode.Unauthorized, 'Missing access token')
    }

    let payload: AccessTokenPayload
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token)
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AppException(401, ErrorCode.TokenExpired, 'Access token expired')
      }
      throw new AppException(401, ErrorCode.Unauthorized, 'Invalid access token')
    }

    const user = await this.usersService.findById(payload.sub)
    if (!user) {
      throw new AppException(401, ErrorCode.Unauthorized, 'Invalid access token')
    }
    if (user.status !== AccountStatus.Active) {
      throw new AppException(403, ErrorCode.AccountSuspended, 'Account is suspended')
    }

    request.user = this.usersService.toAuthUser(user)
    return true
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) return null
    return header.slice('Bearer '.length)
  }
}
