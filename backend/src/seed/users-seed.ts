import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createHash } from 'crypto'
import * as bcrypt from 'bcryptjs'
import { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { AccountStatus, Role } from '../common/enums'
// Registers the global schema defaults (timestamps, id virtual) before the
// user schema is evaluated, so bulkWrite keeps createdAt/updatedAt.
import '../database/mongoose.plugin'
import { User } from '../modules/users/schemas/user.schema'

interface FixtureUser {
  id: number
  name: string
  email: string
  phone?: string
  role: Role
  status: AccountStatus
  createdAt: string
  mockPassword: string
}

export interface UsersSeedResult {
  ids: ReadonlyMap<number, Types.ObjectId>
  created: number
}

export interface UsersSeedModels {
  users: Model<User>
}

function readFixture<T>(filename: string): T[] {
  const fixturePath = resolve(__dirname, '../../../frontend/public/mock', filename)
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T[]
}

// Deterministic ObjectIds: sha256 of `crown-anchor-users:user:<fixtureId>`.
// Re-running the seed targets the same documents, so the replaceOne upserts
// make it idempotent and every consumer can rebuild the same id map.
export function fixtureUserIds(users: { id: number }[]): Map<number, Types.ObjectId> {
  return new Map(
    users.map(({ id }) => [
      id,
      new Types.ObjectId(
        createHash('sha256').update(`crown-anchor-users:user:${id}`).digest('hex').slice(0, 24),
      ),
    ]),
  )
}

// Idempotent users seed: `npm run seed:users` is not wired yet; the master seed
// runner calls seedUsers() and passes the returned id map to the catalog and
// orders/reviews seeds. Fixture passwords are for development only.
export async function seedUsers(models: UsersSeedModels): Promise<UsersSeedResult> {
  const users = readFixture<FixtureUser>('users.json')
  const ids = fixtureUserIds(users)

  const uniquePasswords = [...new Set(users.map((user) => user.mockPassword))]
  const passwordHashes = new Map<string, string>()
  await Promise.all(
    uniquePasswords.map(async (password) => {
      passwordHashes.set(password, await bcrypt.hash(password, 10))
    }),
  )

  const result = await models.users.bulkWrite(
    users.map((user) => {
      const _id = ids.get(user.id)
      const passwordHash = passwordHashes.get(user.mockPassword)
      if (!_id || !passwordHash) {
        throw new Error(`Missing seed data for user fixture ${user.id}`)
      }
      return {
        replaceOne: {
          filter: { _id },
          replacement: {
            _id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            passwordHash,
            role: user.role,
            status: user.status,
            addresses: [] as unknown as User['addresses'],
            createdAt: new Date(user.createdAt),
          },
          upsert: true,
        },
      }
    }),
    { ordered: true },
  )

  return { ids, created: result.upsertedCount }
}
