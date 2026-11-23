import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { AccountStatus, Role } from '../common/enums'
import { User } from '../modules/users/schemas/user.schema'
import {
  mapFixtureUsers,
  resolveSeedPassword,
  seedMasterUsers,
} from './master-users-seed'

interface FixtureUser {
  id: number
  name: string
  email: string
  phone?: string
  role: Role
  status: AccountStatus
  address?: string
  createdAt?: string
  mockPassword?: string
}

function realFixtureUsers(): FixtureUser[] {
  const fixturePath = resolve(__dirname, '../../../frontend/public/mock/users.json')
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as FixtureUser[]
}

// Minimal thenable query chain matching `.select().lean().exec()` / `.exec()`.
function queryResult<T>(value: T) {
  const exec = jest.fn(async () => value)
  const lean = jest.fn(() => ({ exec }))
  const select = jest.fn(() => ({ lean }))
  return { exec, lean, select, thenable: { select, exec, lean } }
}

describe('mapFixtureUsers (real users.json)', () => {
  const fixture = realFixtureUsers()
  const mapped = mapFixtureUsers(fixture)

  it('maps every fixture user', () => {
    expect(mapped).toHaveLength(fixture.length)
    expect(mapped.map((m) => m.fixtureId)).toEqual(fixture.map((u) => u.id))
  })

  it('every fixture user has a non-empty lowercase email', () => {
    for (const m of mapped) {
      expect(m.email).toBeTruthy()
      expect(m.email).toBe(m.email.toLowerCase())
    }
  })

  it('flags admin fixture users and gives them no upsert', () => {
    const admins = mapped.filter((m) => m.isAdminFixture)
    expect(admins).toHaveLength(2)
    for (const admin of admins) {
      expect(admin.upsert).toBeNull()
    }
  })

  it('customers get exactly one Home address; others get none', () => {
    const withAddress = mapped.filter((m) => m.upsert?.addresses.length)
    const customers = fixture.filter((u) => u.role === Role.Customer)
    expect(withAddress).toHaveLength(customers.length)
    for (const m of withAddress) {
      expect(m.upsert?.addresses).toHaveLength(1)
      expect(m.upsert?.addresses[0].label).toBe('Home')
    }
    for (const m of mapped.filter((m) => m.upsert && !m.upsert.addresses.length)) {
      const fixtureUser = fixture.find((u) => u.id === m.fixtureId)
      expect(fixtureUser?.role).not.toBe(Role.Customer)
    }
  })

  it('never copies mockPassword into the output', () => {
    expect(JSON.stringify(mapped)).not.toContain('mockPassword')
    expect(JSON.stringify(mapped)).not.toContain('Demo@1234')
  })

  it('throws when a fixture user has no email', () => {
    expect(() =>
      mapFixtureUsers([{ id: 99, name: 'X', email: '', role: Role.Customer, status: AccountStatus.Active }]),
    ).toThrow(/no email/)
  })
})

describe('resolveSeedPassword', () => {
  it('rejects a missing password without printing anything', () => {
    expect(() => resolveSeedPassword(undefined)).toThrow(/SEED_USER_PASSWORD/)
    expect(() => resolveSeedPassword('')).toThrow(/SEED_USER_PASSWORD/)
  })

  it('rejects a password shorter than 8 characters', () => {
    expect(() => resolveSeedPassword('short12')).toThrow(/at least 8/)
    expect(() => resolveSeedPassword('1234567')).toThrow(/SEED_USER_PASSWORD/)
  })

  it('accepts a password of 8+ characters', () => {
    expect(resolveSeedPassword('longenough')).toBe('longenough')
  })
})

describe('seedMasterUsers', () => {
  const adminId = new Types.ObjectId()
  const userIdsByEmail = new Map(
    realFixtureUsers()
      .filter((u) => u.role !== Role.Admin)
      .map((u) => [u.email.toLowerCase(), new Types.ObjectId()]),
  )
  const userDocs = [...userIdsByEmail.entries()].map(([email, _id]) => ({ _id, email }))

  function buildModels() {
    const adminQuery = queryResult({ _id: adminId })
    const usersQuery = queryResult(userDocs)
    const users = {
      findOne: jest.fn(() => adminQuery.thenable),
      create: jest.fn(async (_doc: unknown) => ({ _id: adminId })),
      bulkWrite: jest.fn(async (_ops: unknown[]) => ({ upsertedCount: 19, matchedCount: 0 })),
      find: jest.fn(() => usersQuery.thenable),
    }
    return { users: users as unknown as Model<User>, mocks: users }
  }

  const ENV_KEYS = ['SEED_USER_PASSWORD', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'] as const
  let savedEnv: Record<string, string | undefined>

  beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]))
    process.env.SEED_USER_PASSWORD = 'test-seed-password'
    process.env.ADMIN_EMAIL = 'Admin@Example.com'
    process.env.ADMIN_PASSWORD = 'admin-secret-value'
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k]
    }
  })

  it('upserts non-admin users by lowercase email with $setOnInsert only', async () => {
    const { users, mocks } = buildModels()
    const result = await seedMasterUsers({ users })

    expect(mocks.bulkWrite).toHaveBeenCalledTimes(1)
    const ops = mocks.bulkWrite.mock.calls[0][0] as {
      updateOne: {
        filter: { email: string }
        update: { $setOnInsert: Record<string, unknown> }
        upsert: boolean
      }
    }[]
    expect(ops).toHaveLength(19)
    for (const op of ops) {
      expect(op.updateOne.filter.email).toBe(op.updateOne.filter.email.toLowerCase())
      expect(op.updateOne.upsert).toBe(true)
      const doc = op.updateOne.update.$setOnInsert
      expect(doc).not.toHaveProperty('mockPassword')
      expect(typeof doc.passwordHash).toBe('string')
      expect(doc.passwordHash).not.toBe('test-seed-password')
    }
    expect(result.created).toBe(19)
    expect(result.existing).toBe(0)
    expect(result.skipped).toBe(2)
    expect(result.ids.size).toBe(21)
  })

  it('finds the existing admin by lowercase email and maps admin fixtures to it', async () => {
    const { users, mocks } = buildModels()
    const result = await seedMasterUsers({ users })

    expect(mocks.findOne).toHaveBeenCalledWith({ email: 'admin@example.com' })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(result.adminCreated).toBe(false)
    const adminFixtureIds = realFixtureUsers()
      .filter((u) => u.role === Role.Admin)
      .map((u) => u.id)
    for (const id of adminFixtureIds) {
      expect(result.ids.get(id)).toEqual(adminId)
    }
  })

  it('creates the admin when missing', async () => {
    const missingAdminQuery = {
      select: () => ({ lean: () => ({ exec: async () => null }) }),
    }
    const usersQuery = queryResult(userDocs)
    const mocks = {
      findOne: jest.fn(() => missingAdminQuery),
      create: jest.fn(async (_doc: unknown) => ({ _id: adminId })),
      bulkWrite: jest.fn(async (_ops: unknown[]) => ({ upsertedCount: 0, matchedCount: 19 })),
      find: jest.fn(() => usersQuery.thenable),
    }
    const users = mocks as unknown as Model<User>

    const result = await seedMasterUsers({ users })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      email: 'admin@example.com',
      role: Role.Admin,
    })
    expect(result.adminCreated).toBe(true)
    expect(result.existing).toBe(19)
  })

  it('stops with a clear error when SEED_USER_PASSWORD is missing', async () => {
    delete process.env.SEED_USER_PASSWORD
    const { users, mocks } = buildModels()
    await expect(seedMasterUsers({ users })).rejects.toThrow(/SEED_USER_PASSWORD/)
    expect(mocks.bulkWrite).not.toHaveBeenCalled()
  })
})
