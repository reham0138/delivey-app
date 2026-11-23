import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as bcrypt from 'bcryptjs'
import { Types } from 'mongoose'
import type { Model } from 'mongoose'
import { AccountStatus, Role } from '../common/enums'
// Registers the global schema defaults (timestamps, id virtual) before the
// user schema is evaluated, so upserts persist createdAt/updatedAt.
import '../database/mongoose.plugin'
import { User } from '../modules/users/schemas/user.schema'

const BCRYPT_ROUNDS = 10 // same cost factor as src/modules/auth/auth.service.ts
const SEED_PASSWORD_MIN_LENGTH = 8

interface FixtureUser {
  id: number
  name: string
  email: string
  phone?: string
  role: Role
  status: AccountStatus
  address?: string
  createdAt?: string
}

export interface MasterUsersSeedResult {
  /** fixture numeric id -> ObjectId for every fixture user (admins -> real admin) */
  ids: ReadonlyMap<number, Types.ObjectId>
  /** non-admin fixture users inserted by this run */
  created: number
  /** non-admin fixture users that already existed */
  existing: number
  /** fixture users with role admin that were not created (mapped to the real admin) */
  skipped: number
  /** whether the real admin document was created by this run */
  adminCreated: boolean
}

export interface MasterUsersSeedModels {
  users: Model<User>
}

export interface MasterUsersSeedOptions {
  /** defaults to process.env.SEED_USER_PASSWORD */
  seedPassword?: string
  /** defaults to process.env.ADMIN_EMAIL */
  adminEmail?: string
  /** defaults to process.env.ADMIN_PASSWORD */
  adminPassword?: string
}

export interface MappedFixtureUser {
  fixtureId: number
  /** lowercase email used for upsert and read-back */
  email: string
  isAdminFixture: boolean
  /** fields written with $setOnInsert; null for admin fixtures (never created) */
  upsert: {
    name: string
    email: string
    phone?: string
    role: Role
    status: AccountStatus
    addresses: { label: string; address: string; phone: string }[]
  } | null
}

function readFixtureUsers(): FixtureUser[] {
  const fixturePath = resolve(__dirname, '../../../frontend/public/mock/users.json')
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as FixtureUser[]
}

// Password for every seeded non-admin fixture user. The value is required and
// never logged or included in error messages.
export function resolveSeedPassword(value: string | undefined): string {
  if (!value || value.length < SEED_PASSWORD_MIN_LENGTH) {
    throw new Error(
      `SEED_USER_PASSWORD must be set to at least ${SEED_PASSWORD_MIN_LENGTH} characters`,
    )
  }
  return value
}

// Pure mapping from fixture users to upsert documents. Admin fixture users are
// flagged but produce no upsert — they map to the real admin's ObjectId later.
// Throws if any fixture user has no usable email. Never copies mockPassword.
export function mapFixtureUsers(fixtureUsers: FixtureUser[]): MappedFixtureUser[] {
  return fixtureUsers.map((user) => {
    const email = user.email?.trim().toLowerCase()
    if (!email) {
      throw new Error(`Fixture user ${user.id} has no email`)
    }
    const isAdminFixture = user.role === Role.Admin
    const addresses =
      !isAdminFixture && user.address && user.phone
        ? [{ label: 'Home', address: user.address, phone: user.phone }]
        : []
    return {
      fixtureId: user.id,
      email,
      isAdminFixture,
      upsert: isAdminFixture
        ? null
        : {
            name: user.name,
            email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            addresses,
          },
    }
  })
}

// Idempotent users seed for the master runner (`npm run seed` / `seed:users`).
// - Non-admin fixture users are upserted by lowercase email with $setOnInsert,
//   so re-running never overwrites a password, role or status changed by hand.
// - Fixture admin users are NOT created; their fixture ids map to the real
//   admin (ADMIN_EMAIL/ADMIN_PASSWORD), replicating seed-admin.ts which is a
//   script without exports.
// - SEED_USER_PASSWORD (>= 8 chars) becomes the password of every seeded
//   non-admin user; it is read from process.env, never logged.
export async function seedMasterUsers(
  models: MasterUsersSeedModels,
  options: MasterUsersSeedOptions = {},
): Promise<MasterUsersSeedResult> {
  const fixtureUsers = readFixtureUsers()
  const mapped = mapFixtureUsers(fixtureUsers)

  const seedPassword = resolveSeedPassword(
    options.seedPassword ?? process.env.SEED_USER_PASSWORD,
  )
  const adminEmail = (options.adminEmail ?? process.env.ADMIN_EMAIL)?.trim().toLowerCase()
  const adminPassword = options.adminPassword ?? process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin user')
  }

  // Real admin: find or create, never overwriting an existing document
  // (same minimal logic as src/seed/seed-admin.ts, which exports nothing).
  const adminHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS)
  const existingAdmin = await models.users
    .findOne({ email: adminEmail })
    .select('_id')
    .lean()
    .exec()
  let adminId: Types.ObjectId
  let adminCreated = false
  if (existingAdmin) {
    adminId = existingAdmin._id as Types.ObjectId
  } else {
    const createdAdmin = await models.users.create({
      name: 'Admin',
      email: adminEmail,
      passwordHash: adminHash,
      role: Role.Admin,
      status: AccountStatus.Active,
    })
    adminId = createdAdmin._id as Types.ObjectId
    adminCreated = true
  }

  // One shared hash: every seeded non-admin user gets SEED_USER_PASSWORD.
  const userPasswordHash = await bcrypt.hash(seedPassword, BCRYPT_ROUNDS)

  const upserts = mapped.flatMap((m) => (m.upsert ? [{ ...m, upsert: m.upsert }] : []))
  let created = 0
  let existing = 0
  if (upserts.length > 0) {
    const result = await models.users.bulkWrite(
      upserts.map((m) => ({
        updateOne: {
          filter: { email: m.email },
          update: {
            $setOnInsert: {
              ...m.upsert,
              addresses: m.upsert.addresses as unknown as User['addresses'],
              passwordHash: userPasswordHash,
            },
          },
          upsert: true,
        },
      })),
      { ordered: true },
    )
    created = result.upsertedCount
    existing = result.matchedCount
  }

  // Read ids back by email so the map is complete even when everything existed.
  const emails = upserts.map((m) => m.email)
  const docs = emails.length
    ? await models.users
        .find({ email: { $in: emails } })
        .select('_id email')
        .lean()
        .exec()
    : []
  const idByEmail = new Map(docs.map((doc) => [doc.email, doc._id as Types.ObjectId]))

  const ids = new Map<number, Types.ObjectId>()
  for (const user of fixtureUsers) {
    if (user.role === Role.Admin) {
      ids.set(user.id, adminId)
      continue
    }
    const mappedUser = mapped.find((m) => m.fixtureId === user.id)
    const id = mappedUser ? idByEmail.get(mappedUser.email) : undefined
    if (!id) {
      throw new Error(`Failed to resolve seeded user id for fixture user ${user.id}`)
    }
    ids.set(user.id, id)
  }

  return {
    ids,
    created,
    existing,
    skipped: mapped.filter((m) => m.isAdminFixture).length,
    adminCreated,
  }
}
