import { Test } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { getModelToken } from '@nestjs/mongoose'
import { Types } from 'mongoose'
import * as bcrypt from 'bcryptjs'
import { AuthService } from './auth.service'
import { Session } from './schemas/session.schema'
import { UsersService } from '../users/users.service'
import { Role, AccountStatus } from '../../common/enums'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import { AppException } from '../../common/errors'

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  id: 'user-id',
  name: 'Test User',
  email: 'test@example.com',
  passwordHash: '',
  phone: '+96170111222',
  role: Role.Customer,
  status: AccountStatus.Active,
  addresses: [],
  ...overrides,
})

const makeSession = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  familyId: 'family-1',
  tokenHash: 'hash',
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: undefined,
  userAgent: 'jest',
  ...overrides,
})

const expectAppError = async (
  promise: Promise<unknown>,
  status: number,
  code: ErrorCode,
): Promise<void> => {
  const error = await promise.catch((e) => e)
  expect(error).toBeInstanceOf(AppException)
  expect((error as AppException).getStatus()).toBe(status)
  expect((error as AppException).code).toBe(code)
}

describe('AuthService', () => {
  let service: AuthService
  let usersService: {
    findByEmail: jest.Mock
    findByEmailWithPassword: jest.Mock
    findById: jest.Mock
    create: jest.Mock
    toAuthUser: jest.Mock
  }
  let sessionModel: {
    findOne: jest.Mock
    findOneAndUpdate: jest.Mock
    create: jest.Mock
    updateOne: jest.Mock
    updateMany: jest.Mock
  }
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock }

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      toAuthUser: jest.fn((u) => ({ id: u.id, role: u.role, email: u.email, name: u.name })),
    }
    sessionModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    }
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-access-token'),
      verifyAsync: jest.fn(),
    }

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(7) } },
        { provide: getModelToken(Session.name), useValue: sessionModel },
      ],
    }).compile()

    service = module.get(AuthService)
  })

  describe('register', () => {
    it('rejects duplicate emails with 409 EMAIL_ALREADY_EXISTS', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser())
      await expectAppError(
        service.register({
          name: 'New',
          email: 'TEST@example.com',
          password: 'password123',
          role: Role.Customer,
        }),
        409,
        ErrorCode.EmailAlreadyExists,
      )
      // Email lookup is case-insensitive.
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com')
    })

    it('hashes the password with bcrypt and returns an auth response', async () => {
      usersService.findByEmail.mockResolvedValue(null)
      const user = makeUser()
      usersService.create.mockResolvedValue(user)

      const res = await service.register({
        name: 'New',
        email: 'new@example.com',
        password: 'password123',
        role: Role.Customer,
      })

      const created = usersService.create.mock.calls[0][0]
      expect(await bcrypt.compare('password123', created.passwordHash)).toBe(true)
      expect(created.passwordHash).not.toBe('password123')
      expect(res).toMatchObject({
        access_token: 'signed-access-token',
        user: { email: 'test@example.com' },
      })
      expect(res.refresh_token).toMatch(/^[0-9a-f]{96}$/)
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: expect.any(String),
        role: Role.Customer,
      })
      expect(sessionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ familyId: expect.any(String) }),
      )
    })
  })

  describe('login', () => {
    it('rejects wrong passwords with INVALID_CREDENTIALS', async () => {
      const user = makeUser({ passwordHash: await bcrypt.hash('right-password', 10) })
      usersService.findByEmailWithPassword.mockResolvedValue(user)

      await expectAppError(
        service.login({ email: 'test@example.com', password: 'wrong' }),
        401,
        ErrorCode.InvalidCredentials,
      )
    })

    it('rejects suspended accounts with ACCOUNT_SUSPENDED', async () => {
      const user = makeUser({
        status: AccountStatus.Suspended,
        passwordHash: await bcrypt.hash('password123', 10),
      })
      usersService.findByEmailWithPassword.mockResolvedValue(user)

      await expectAppError(
        service.login({ email: 'test@example.com', password: 'password123' }),
        403,
        ErrorCode.AccountSuspended,
      )
    })

    it('returns tokens for valid credentials', async () => {
      const user = makeUser({ passwordHash: await bcrypt.hash('password123', 10) })
      usersService.findByEmailWithPassword.mockResolvedValue(user)

      const res = await service.login({ email: 'test@example.com', password: 'password123' })
      expect(res.access_token).toBe('signed-access-token')
      expect(res.refresh_token).toMatch(/^[0-9a-f]{96}$/)
    })
  })

  describe('refresh', () => {
    it('rejects unknown tokens with INVALID_REFRESH_TOKEN', async () => {
      sessionModel.findOne.mockResolvedValue(null)
      await expectAppError(service.refresh({ refresh_token: 'nope' }), 401, ErrorCode.InvalidRefreshToken)
    })

    it('rejects expired sessions', async () => {
      sessionModel.findOne.mockResolvedValue(
        makeSession({ expiresAt: new Date(Date.now() - 1000) }),
      )
      await expectAppError(service.refresh({ refresh_token: 'x' }), 401, ErrorCode.InvalidRefreshToken)
    })

    it('rotates a valid session into the same family', async () => {
      const session = makeSession()
      sessionModel.findOne.mockResolvedValue(session)
      sessionModel.findOneAndUpdate.mockResolvedValue(session)
      usersService.findById.mockResolvedValue(makeUser())

      const res = await service.refresh({ refresh_token: 'raw-token' })

      // Old session revoked atomically, linked to the new hash.
      expect(sessionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: session._id, revokedAt: null },
        { $set: { revokedAt: expect.any(Date), replacedBy: expect.any(String) } },
      )
      // New session keeps the familyId.
      expect(sessionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ familyId: 'family-1' }),
      )
      expect(res.access_token).toBe('signed-access-token')
      expect(res.refresh_token).not.toBe('raw-token')
    })

    it('revokes the whole family when a revoked token is reused', async () => {
      sessionModel.findOne.mockResolvedValue(makeSession({ revokedAt: new Date() }))

      await expectAppError(service.refresh({ refresh_token: 'old-token' }), 401, ErrorCode.InvalidRefreshToken)
      expect(sessionModel.updateMany).toHaveBeenCalledWith(
        { familyId: 'family-1', revokedAt: null },
        { $set: { revokedAt: expect.any(Date) } },
      )
      expect(sessionModel.create).not.toHaveBeenCalled()
    })

    it('rejects suspended users on refresh', async () => {
      sessionModel.findOne.mockResolvedValue(makeSession())
      sessionModel.findOneAndUpdate.mockResolvedValue(makeSession())
      usersService.findById.mockResolvedValue(makeUser({ status: AccountStatus.Suspended }))

      await expectAppError(service.refresh({ refresh_token: 'x' }), 403, ErrorCode.AccountSuspended)
    })
  })

  describe('logout', () => {
    it('revokes the session and always resolves', async () => {
      await expect(service.logout({ refresh_token: 'x' })).resolves.toBeUndefined()
      expect(sessionModel.updateOne).toHaveBeenCalledWith(
        { tokenHash: expect.any(String), revokedAt: null },
        { $set: { revokedAt: expect.any(Date) } },
      )
    })
  })

  describe('revokeAllSessions', () => {
    it('revokes every live session for the user', async () => {
      await service.revokeAllSessions(new Types.ObjectId().toString())
      expect(sessionModel.updateMany).toHaveBeenCalledWith(
        { userId: expect.any(Types.ObjectId), revokedAt: null },
        { $set: { revokedAt: expect.any(Date) } },
      )
    })
  })
})
