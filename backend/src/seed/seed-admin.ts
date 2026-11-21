import 'dotenv/config'
import mongoose from 'mongoose'
import * as bcrypt from 'bcryptjs'
import { Role, AccountStatus } from '../common/enums'
import { User, UserSchema } from '../modules/users/schemas/user.schema'

// Idempotent admin seed: `npm run seed:admin`.
// Reads MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD from .env. Never logs the password.
async function main() {
  const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
  if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env')
  }

  await mongoose.connect(MONGODB_URI)
  const userModel = mongoose.model(User.name, UserSchema)
  const email = ADMIN_EMAIL.toLowerCase()

  const existing = await userModel.findOne({ email })
  if (existing) {
    console.log(`Admin already exists (${email}) — nothing to do.`)
  } else {
    await userModel.create({
      name: 'Admin',
      email,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: Role.Admin,
      status: AccountStatus.Active,
    })
    console.log(`Admin created (${email}).`)
  }

  await mongoose.disconnect()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
