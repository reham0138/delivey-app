import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { ROLES_KEY } from '../../../common/decorators/roles.decorator'
import { AppException } from '../../../common/errors'
import { ErrorCode } from '../../../common/errors/error-codes.enum'
import type { AuthUser } from '../../../common/interfaces/auth-user.interface'

/** Global guard: enforces @Roles(...) after JwtAuthGuard has attached request.user. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required?.length) return true

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>()
    if (!request.user || !required.includes(request.user.role)) {
      throw new AppException(403, ErrorCode.Forbidden, 'Insufficient permissions')
    }
    return true
  }
}
