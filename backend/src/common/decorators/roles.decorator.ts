import { SetMetadata } from '@nestjs/common'
import { Role } from '../enums'

export const ROLES_KEY = 'roles'

// Usage: @Roles(Role.Admin) on a controller or handler.
// The RolesGuard (arrives with the auth module) reads this metadata.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
