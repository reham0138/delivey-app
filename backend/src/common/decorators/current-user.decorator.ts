import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { AuthUser } from '../interfaces/auth-user.interface'

// Reads req.user populated by the auth guard (JWT strategy, auth module).
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null => {
    const request = ctx.switchToHttp().getRequest()
    return (request.user as AuthUser) ?? null
  },
)
