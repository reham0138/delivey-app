import { Types } from 'mongoose'
import { AppException } from '../../common/errors'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import { AccountStatus, Role } from '../../common/enums'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { AdminService, toAdminUserRow } from './admin.service'

const adminCaller: AuthUser = {
  id: '64b0000000000000000000aa',
  name: 'Root Admin',
  email: 'admin@example.com',
  role: Role.Admin,
}

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId('64b000000000000000000001'),
    name: 'Layla',
    email: 'layla@example.com',
    phone: '+963111',
    role: Role.Customer,
    status: AccountStatus.Active,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    passwordHash: 'SECRET_HASH',
    addresses: [{ label: 'Home', address: 'x', phone: 'y' }],
    ...overrides,
  }
}

describe('AdminService.findAllUsers', () => {
  function setup(rows: unknown[] = [], total = 0) {
    const userModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(rows) }),
            }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockResolvedValue(total),
    }
    const authService = { revokeAllSessions: jest.fn() }
    const service = new AdminService(userModel as never, authService as never)
    return { service, userModel, authService }
  }

  it('builds the right filter for search, role and status', async () => {
    const { service, userModel } = setup()
    await service.findAllUsers({
      search: 'layla',
      role: Role.Customer,
      status: AccountStatus.Suspended,
      page: 1,
      limit: 10,
    })
    const filter = userModel.find.mock.calls[0][0]
    expect(filter.role).toBe(Role.Customer)
    expect(filter.status).toBe(AccountStatus.Suspended)
    expect(filter.$or).toHaveLength(3)
    expect(String(filter.$or[0].name)).toContain('layla')
    expect(String(filter.$or[1].email)).toContain('layla')
    expect(String(filter.$or[2].phone)).toContain('layla')
    expect(String(filter.$or[0].name)).toMatch(/^\/layla\/i$/)
  })

  it('escapes regex special characters in search literally', async () => {
    const { service, userModel } = setup()
    await service.findAllUsers({ search: '.*', page: 1, limit: 10 })
    const filter = userModel.find.mock.calls[0][0]
    expect(String(filter.$or[0].name)).toBe('/\\.\\*/i')
    await service.findAllUsers({ search: '(a+)+$', page: 1, limit: 10 })
    const filter2 = userModel.find.mock.calls[1][0]
    expect(String(filter2.$or[0].name)).toBe('/\\(a\\+\\)\\+\\$/i')
  })

  it('paginates with total_pages at least 1 and maps rows without secrets', async () => {
    const { service } = setup([userRow()], 25)
    const res = await service.findAllUsers({ page: 2, limit: 10 })
    expect(res.meta).toEqual({ total: 25, page: 2, limit: 10, total_pages: 3 })
    expect(res.data[0]).toEqual({
      id: '64b000000000000000000001',
      name: 'Layla',
      email: 'layla@example.com',
      phone: '+963111',
      role: Role.Customer,
      status: AccountStatus.Active,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    })
    expect(res.data[0]).not.toHaveProperty('passwordHash')
    expect(res.data[0]).not.toHaveProperty('addresses')
  })

  it('returns empty phone as empty string and total_pages 1 when empty', async () => {
    const { service } = setup([userRow({ phone: undefined })], 0)
    const res = await service.findAllUsers({ page: 1, limit: 10 })
    expect(res.data[0].phone).toBe('')
    const empty = await service.findAllUsers({ page: 9, limit: 10 })
    expect(empty.meta.total_pages).toBe(1)
  })
})

describe('AdminService.updateUserStatus', () => {
  function setup(user: unknown) {
    const userModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(user) }),
      }),
      updateOne: jest.fn().mockResolvedValue({}),
    }
    const authService = { revokeAllSessions: jest.fn().mockResolvedValue(undefined) }
    const service = new AdminService(userModel as never, authService as never)
    return { service, userModel, authService }
  }

  it('returns 404 for an invalid id format', async () => {
    const { service } = setup(null)
    await expect(
      service.updateUserStatus('not-an-id', AccountStatus.Suspended, adminCaller),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('returns 404 for an unknown user', async () => {
    const { service } = setup(null)
    await expect(
      service.updateUserStatus(new Types.ObjectId().toString(), AccountStatus.Suspended, adminCaller),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('returns 403 when the target is an admin', async () => {
    const { service, userModel, authService } = setup(
      userRow({ role: Role.Admin, _id: new Types.ObjectId('64b0000000000000000000bb') }),
    )
    await expect(
      service.updateUserStatus('64b0000000000000000000bb', AccountStatus.Suspended, adminCaller),
    ).rejects.toMatchObject({ status: 403 })
    expect(userModel.updateOne).not.toHaveBeenCalled()
    expect(authService.revokeAllSessions).not.toHaveBeenCalled()
  })

  it('returns 403 when the target is the caller', async () => {
    const { service } = setup(
      userRow({ role: Role.Admin, _id: new Types.ObjectId(adminCaller.id) }),
    )
    await expect(
      service.updateUserStatus(adminCaller.id, AccountStatus.Suspended, adminCaller),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('suspending calls revokeAllSessions exactly once with the user id', async () => {
    const id = new Types.ObjectId()
    const { service, authService } = setup(
      userRow({ _id: id, status: AccountStatus.Active }),
    )
    const row = await service.updateUserStatus(id.toString(), AccountStatus.Suspended, adminCaller)
    expect(authService.revokeAllSessions).toHaveBeenCalledTimes(1)
    expect(authService.revokeAllSessions).toHaveBeenCalledWith(id.toString())
    expect(row.status).toBe(AccountStatus.Suspended)
  })

  it('activating does not revoke sessions', async () => {
    const id = new Types.ObjectId()
    const { service, authService } = setup(
      userRow({ _id: id, status: AccountStatus.Suspended }),
    )
    const row = await service.updateUserStatus(id.toString(), AccountStatus.Active, adminCaller)
    expect(authService.revokeAllSessions).not.toHaveBeenCalled()
    expect(row.status).toBe(AccountStatus.Active)
  })

  it('is idempotent: same status returns 200 row with no update', async () => {
    const id = new Types.ObjectId()
    const { service, userModel, authService } = setup(
      userRow({ _id: id, status: AccountStatus.Active }),
    )
    const row = await service.updateUserStatus(id.toString(), AccountStatus.Active, adminCaller)
    expect(row.status).toBe(AccountStatus.Active)
    expect(userModel.updateOne).not.toHaveBeenCalled()
    expect(authService.revokeAllSessions).not.toHaveBeenCalled()
  })

  it('updates only the status field', async () => {
    const id = new Types.ObjectId()
    const { service, userModel } = setup(userRow({ _id: id }))
    await service.updateUserStatus(id.toString(), AccountStatus.Suspended, adminCaller)
    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: id },
      { $set: { status: AccountStatus.Suspended } },
    )
  })
})

describe('toAdminUserRow', () => {
  it('never leaks passwordHash or addresses', () => {
    const row = toAdminUserRow(userRow() as never)
    const keys = Object.keys(row).sort()
    expect(keys).toEqual(['createdAt', 'email', 'id', 'name', 'phone', 'role', 'status'])
  })
})

describe('AppException usage', () => {
  it('uses FORBIDDEN and NOT_FOUND codes', () => {
    expect(ErrorCode.Forbidden).toBe('FORBIDDEN')
    expect(ErrorCode.NotFound).toBe('NOT_FOUND')
    expect(AppException).toBeDefined()
  })
})
