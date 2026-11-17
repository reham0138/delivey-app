import { listRegisteredUsers } from '@/shared/api/auth'
import { adminState } from '@/shared/services/adminState.service'
import type { AccountStatus, User, UserRole } from '@/shared/types'

// Replace the bodies with Axios calls when the backend is ready. Keep the signatures and return types.

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load admin data (HTTP ${response.status}).`)
  return response.json() as Promise<T>
}

export interface AdminUserRow {
  id: number
  name: string
  email: string
  phone: string
  role: UserRole
  /** The admin's decision if there is one, otherwise the status from the fixture. */
  status: AccountStatus
  /** null for accounts made with the sign-up form (the mock does not store a date). */
  createdAt: string | null
  source: 'demo' | 'registered'
}

export const adminService = {
  /** Demo accounts from users.json plus accounts created with the sign-up form. */
  async listUsers(): Promise<AdminUserRow[]> {
    const fixtures = await fetchJson<User[]>('/mock/users.json')
    const demoRows: AdminUserRow[] = fixtures.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: adminState.getUserStatus(user.email, user.status),
      createdAt: user.createdAt,
      source: 'demo',
    }))
    const knownEmails = new Set(demoRows.map((row) => row.email.toLowerCase()))
    const registeredRows: AdminUserRow[] = listRegisteredUsers()
      .filter((user) => !knownEmails.has(user.email.toLowerCase()))
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
        role: user.role,
        status: adminState.getUserStatus(user.email, 'active'),
        createdAt: null,
        source: 'registered',
      }))
    return [...demoRows, ...registeredRows]
  },

  async setUserStatus(email: string, status: AccountStatus): Promise<void> {
    const user = (await this.listUsers()).find((row) => row.email.toLowerCase() === email.toLowerCase())
    if (!user) throw new Error('User not found.')
    if (user.role === 'admin') throw new Error('Admin accounts cannot be suspended.')
    adminState.setUserStatus(user.email, status)
  },
}