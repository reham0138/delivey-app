// Replace the bodies with Axios calls when the backend is ready. Keep the signatures.
import { getRefreshToken, getStoredUser } from '@/shared/services/auth.service'
import type { AuthResponse, LoginPayload, RegisterPayload, Role, UpdateProfilePayload, User } from '@/shared/types/user'

const USERS_STORAGE_KEY = 'crown-anchor-mock-auth-users'
const MOCK_DELAY_MS = 500

type StoredMockUser = User & { password: string }

function isStoredMockUser(value: unknown): value is StoredMockUser {
	if (typeof value !== 'object' || value === null) return false

	const candidate = value as Record<string, unknown>
	return (
		typeof candidate.id === 'number' &&
		typeof candidate.name === 'string' &&
		typeof candidate.email === 'string' &&
		typeof candidate.password === 'string' &&
		(candidate.phone === undefined || typeof candidate.phone === 'string') &&
		(candidate.role === 'customer' || candidate.role === 'restaurant' || candidate.role === 'admin')
	)
}

function createSeedAdmin(): StoredMockUser {
	return {
		id: 1,
		name: 'Admin',
		email: 'admin@test.com',
		role: 'admin',
		password: '123456',
	}
}

function saveUsers(users: StoredMockUser[]): void {
	try {
		window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
	} catch {
		throw new Error('Mock authentication storage is unavailable.')
	}
}

function readUsers(): StoredMockUser[] {
	try {
		const storedUsers = window.localStorage.getItem(USERS_STORAGE_KEY)
		if (storedUsers) {
			let parsedUsers: unknown
			try {
				parsedUsers = JSON.parse(storedUsers)
			} catch {
				parsedUsers = null
			}

			if (Array.isArray(parsedUsers)) {
				const users = parsedUsers.filter(isStoredMockUser)
				if (!users.some((user) => user.email === 'admin@test.com')) {
					users.unshift(createSeedAdmin())
					saveUsers(users)
				}
				return users
			}
		}

		const users = [createSeedAdmin()]
		saveUsers(users)
		return users
	} catch {
		throw new Error('Mock authentication storage is unavailable.')
	}
}

function waitForMockApi(): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, MOCK_DELAY_MS))
}

function createToken(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createAuthResponse(record: StoredMockUser): AuthResponse {
	const user: User = {
		id: record.id,
		name: record.name,
		email: record.email,
		...(record.phone === undefined ? {} : { phone: record.phone }),
		role: record.role,
	}

	return {
		access_token: createToken('mock-access'),
		refresh_token: createToken('mock-refresh'),
		user,
	}
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
	await waitForMockApi()
	const email = payload.email.trim().toLowerCase()
	const record = readUsers().find((user) => user.email.toLowerCase() === email)
	if (!record || record.password !== payload.password) {
		throw new Error('Invalid email or password.')
	}
	return createAuthResponse(record)
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
	await waitForMockApi()
	const users = readUsers()
	const email = payload.email.trim().toLowerCase()
	if (users.some((user) => user.email.toLowerCase() === email)) {
		throw new Error('An account with this email already exists.')
	}

	const role: Role = payload.role === 'restaurant' ? 'restaurant' : 'customer'
	const record: StoredMockUser = {
		id: users.reduce((highestId, user) => Math.max(highestId, user.id), 0) + 1,
		name: payload.name.trim(),
		email,
		role,
		password: payload.password,
	}
	users.push(record)
	saveUsers(users)
	return createAuthResponse(record)
}

export async function updateProfile(userId: number, changes: UpdateProfilePayload): Promise<User> {
	await waitForMockApi()
	const users = readUsers()
	const userIndex = users.findIndex((user) => user.id === userId)
	const record = users[userIndex]
	if (!record) throw new Error(`User with id ${userId} was not found.`)

	const updatedRecord: StoredMockUser = {
		...record,
		name: changes.name.trim(),
	}
	const phone = changes.phone?.trim()
	if (phone) {
		updatedRecord.phone = phone
	} else {
		delete updatedRecord.phone
	}
	users[userIndex] = updatedRecord
	saveUsers(users)

	return {
		id: updatedRecord.id,
		name: updatedRecord.name,
		email: updatedRecord.email,
		...(updatedRecord.phone === undefined ? {} : { phone: updatedRecord.phone }),
		role: updatedRecord.role,
	}
}

export async function logout(): Promise<void> {
	await waitForMockApi()
}

export async function refresh(): Promise<AuthResponse> {
	await waitForMockApi()
	if (!getRefreshToken()) throw new Error('No refresh token is available.')

	const storedUser = getStoredUser()
	if (!storedUser) throw new Error('No signed-in user is available.')

	const record = readUsers().find((user) => user.id === storedUser.id)
	if (!record) throw new Error('The stored user no longer exists.')
	return createAuthResponse(record)
}