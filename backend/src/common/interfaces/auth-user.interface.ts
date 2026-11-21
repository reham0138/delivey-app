import type { Role } from '../enums'

// Shape of the authenticated user attached to the request by the auth guard.
export interface AuthUser {
  id: string
  role: Role
  email: string
  name: string
  phone?: string
  restaurantId?: string
}
