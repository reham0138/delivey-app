import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from './roles.guard'
import { Role } from '../../../common/enums'
import { ErrorCode } from '../../../common/errors/error-codes.enum'
import { AppException } from '../../../common/errors'

const makeContext = (user?: { role: Role }) =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: { getAllAndOverride: jest.Mock }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() }
    guard = new RolesGuard(reflector as unknown as Reflector)
  })

  it('allows routes without @Roles metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined)
    expect(guard.canActivate(makeContext())).toBe(true)
  })

  it('allows matching roles', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Customer])
    expect(guard.canActivate(makeContext({ role: Role.Customer }))).toBe(true)
  })

  it('rejects mismatched roles with 403 FORBIDDEN', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Customer])
    try {
      guard.canActivate(makeContext({ role: Role.Admin }))
      fail('expected RolesGuard to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(AppException)
      expect((error as AppException).getStatus()).toBe(403)
      expect((error as AppException).code).toBe(ErrorCode.Forbidden)
    }
  })

  it('rejects when no user is attached', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Customer])
    expect(() => guard.canActivate(makeContext())).toThrow(AppException)
  })
})
