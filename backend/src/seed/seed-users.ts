import 'dotenv/config'
import mongoose from 'mongoose'
// Registers the global schema defaults (timestamps, id virtual) before the
// user schema is evaluated, so upserts persist createdAt/updatedAt.
import '../database/mongoose.plugin'
import { User, UserSchema } from '../modules/users/schemas/user.schema'
import { seedMasterUsers } from './master-users-seed'

// Users-only seed: `npm run seed:users`. Idempotent — upserts by email with
// $setOnInsert, so re-running never overwrites changed passwords/roles/status.
async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI must be set in .env')

  await mongoose.connect(uri)
  try {
    console.log(`Seeding database: ${mongoose.connection.db?.databaseName ?? 'unknown'}`)
    const result = await seedMasterUsers({
      users: mongoose.model(User.name, UserSchema),
    })
    console.log(
      `Users: ${result.created} created, ${result.existing} already existed, ` +
        `${result.skipped} admin fixture users skipped (mapped to the real admin). ` +
        `Admin ${result.adminCreated ? 'created' : 'already existed'}. ` +
        `${result.ids.size} fixture ids mapped.`,
    )
  } finally {
    await mongoose.disconnect()
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
