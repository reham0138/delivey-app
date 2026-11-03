import type { User } from '@/shared/types/user'

const ACCESS_TOKEN_KEY = 'crown-anchor-access-token'
const REFRESH_TOKEN_KEY = 'crown-anchor-refresh-token'
const STORED_USER_KEY = 'crown-anchor-auth-user'

function isUser(value: unknown): value is User {
	if (typeof value !== 'object' || value === null) return false

	const candidate = value as Record<string, unknown>
	return (
		typeof candidate.id === 'number' &&
		typeof candidate.name === 'string' &&
		typeof candidate.email === 'string' &&
		(candidate.phone === undefined || typeof candidate.phone === 'string') &&
		(candidate.role === 'customer' || candidate.role === 'restaurant' || candidate.role === 'admin')
	)
}

export function getAccessToken(): string | null {
	try {
		return window.localStorage.getItem(ACCESS_TOKEN_KEY)
	} catch {
		return null
	}
}

export function getRefreshToken(): string | null {
	try {
		return window.localStorage.getItem(REFRESH_TOKEN_KEY)
	} catch {
		return null
	}
}

export function setTokens(accessToken: string, refreshToken: string): void {
	try {
		window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
		window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
	} catch {
		return
	}
}

export function clearTokens(): void {
	try {
		window.localStorage.removeItem(ACCESS_TOKEN_KEY)
		window.localStorage.removeItem(REFRESH_TOKEN_KEY)
	} catch {
		return
	}
}

export function getStoredUser(): User | null {
	try {
		const storedUser = window.localStorage.getItem(STORED_USER_KEY)
		if (!storedUser) return null

		const parsedUser: unknown = JSON.parse(storedUser)
		return isUser(parsedUser) ? parsedUser : null
	} catch {
		return null
	}
}

export function setStoredUser(user: User | null): void {
	try {
		if (user) {
			window.localStorage.setItem(STORED_USER_KEY, JSON.stringify(user))
		} else {
			window.localStorage.removeItem(STORED_USER_KEY)
		}
	} catch {
		return
	}
}
