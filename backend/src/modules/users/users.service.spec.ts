import { Test } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { Types } from 'mongoose'
import { UsersService } from './users.service'
import { User, UserDocument } from './schemas/user.schema'
import { Role, AccountStatus } from '../../common/enums'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import { AppException } from '../../common/errors'

const makeUserDoc = (overrides: Record<string, unknown> = {}) =>
  ({
    _id: new Types.ObjectId(),
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: Role.Customer,
    status: AccountStatus.Active,
    phone: '+96170111222',
    addresses: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as UserDocument

describe('UsersService', () => {
  let service: UsersService
  let userModel: { findById: jest.Mock; findOne: jest.Mock }

  beforeEach(async () => {
    userModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
    }
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile()
    service = module.get(UsersService)
  })

  it('maps a user document to the AuthUser shape (no passwordHash)', () => {
    const authUser = service.toAuthUser(
      makeUserDoc({ passwordHash: 'secret', phone: undefined }),
    )
    expect(authUser).toEqual({
      id: 'user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: Role.Customer,
    })
    expect(authUser).not.toHaveProperty('passwordHash')
  })

  it('updateProfile updates name and phone and returns AuthUser', async () => {
    const doc = makeUserDoc()
    const userId = new Types.ObjectId().toString()
    userModel.findById.mockResolvedValue(doc)

    const result = await service.updateProfile(userId, {
      name: 'New Name',
      phone: '+96170000000',
    })

    expect(doc.name).toBe('New Name')
    expect(doc.phone).toBe('+96170000000')
    expect(doc.save).toHaveBeenCalled()
    expect(result.name).toBe('New Name')
  })

  it('rejects updateProfile for unknown users', async () => {
    userModel.findById.mockResolvedValue(null)
    const error = await service.updateProfile('missing', { name: 'X' }).catch((e) => e)
    expect(error).toBeInstanceOf(AppException)
    expect((error as AppException).getStatus()).toBe(404)
    expect((error as AppException).code).toBe(ErrorCode.NotFound)
  })

  it('lowercases emails on lookup', async () => {
    userModel.findOne.mockResolvedValue(null)
    await service.findByEmail('TEST@Example.COM')
    expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' })
  })
})
