import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { TokenExpiredError } from 'jsonwebtoken'
import { JwtAuthGuard } from './jwt-auth.guard'
import { UsersService } from '../../users/users.service'
import { Role, AccountStatus } from '../../../common/enums'
import { ErrorCode } from '../../../common/errors/error-codes.enum'
import { AppException } from '../../../common/errors'
import { RestaurantsController } from '../../restaurants/restaurants.controller'

const makeContext = (
  authorization?: string,
  handler: object = () => undefined,
  controller: object = Object,
) => {
  const request: Record<string, unknown> = { headers: {} }
  if (authorization) request.headers = { authorization }
  return {
    request,
    context: {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
  }
}

const expectGuardError = async (
  promise: Promise<boolean>,
  status: number,
  code: ErrorCode,
): Promise<void> => {
  const error = await promise.catch((e) => e)
  expect(error).toBeInstanceOf(AppException)
  expect((error as AppException).getStatus()).toBe(status)
  expect((error as AppException).code).toBe(code)
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard
  let jwtService: { verifyAsync: jest.Mock }
  let usersService: { findById: jest.Mock; toAuthUser: jest.Mock }
  let reflector: { getAllAndOverride: jest.Mock }

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() }
    usersService = {
      findById: jest.fn(),
      toAuthUser: jest.fn((u) => ({ id: u.id, role: u.role, email: u.email, name: u.name })),
    }
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) }
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
      usersService as unknown as UsersService,
    )
  })

  it('lets @Public routes through without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true)
    const { context } = makeContext()
    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(jwtService.verifyAsync).not.toHaveBeenCalled()
  })

  it('rejects missing tokens with UNAUTHORIZED', async () => {
    const { context } = makeContext()
    await expectGuardError(guard.canActivate(context), 401, ErrorCode.Unauthorized)
  })

  it('returns 401 for a route without @Public when no token is provided', async () => {
    const protectedGuard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      new Reflector(),
      usersService as unknown as UsersService,
    )
    const { context } = makeContext(
      undefined,
      RestaurantsController.prototype.findMine,
      RestaurantsController,
    )

    await expectGuardError(protectedGuard.canActivate(context), 401, ErrorCode.Unauthorized)
  })

  it('rejects expired tokens with TOKEN_EXPIRED', async () => {
    jwtService.verifyAsync.mockRejectedValue(new TokenExpiredError('jwt expired', new Date()))
    const { context } = makeContext('Bearer token')
    await expectGuardError(guard.canActivate(context), 401, ErrorCode.TokenExpired)
  })

  it('rejects invalid tokens with UNAUTHORIZED', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('bad signature'))
    const { context } = makeContext('Bearer token')
    await expectGuardError(guard.canActivate(context), 401, ErrorCode.Unauthorized)
  })

  it('rejects unknown users with UNAUTHORIZED', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'ghost', role: Role.Customer })
    usersService.findById.mockResolvedValue(null)
    const { context } = makeContext('Bearer token')
    await expectGuardError(guard.canActivate(context), 401, ErrorCode.Unauthorized)
  })

  it('rejects suspended users with ACCOUNT_SUSPENDED', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', role: Role.Customer })
    usersService.findById.mockResolvedValue({
      id: 'u1',
      status: AccountStatus.Suspended,
      role: Role.Customer,
      email: 'a@b.c',
      name: 'A',
    })
    const { context } = makeContext('Bearer token')
    await expectGuardError(guard.canActivate(context), 403, ErrorCode.AccountSuspended)
  })

  it('attaches the AuthUser to the request on success', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', role: Role.Customer })
    const user = {
      id: 'u1',
      status: AccountStatus.Active,
      role: Role.Customer,
      email: 'a@b.c',
      name: 'A',
    }
    usersService.findById.mockResolvedValue(user)
    const { context, request } = makeContext('Bearer token')

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(request.user).toEqual({ id: 'u1', role: Role.Customer, email: 'a@b.c', name: 'A' })
    expect(usersService.toAuthUser).toHaveBeenCalledWith(user)
  })
})
