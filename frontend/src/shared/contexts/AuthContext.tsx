import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import * as authApi from '@/shared/api/auth'
import { SESSION_EXPIRED_EVENT } from '@/shared/api/client'
import { AuthContext } from '@/shared/contexts/AuthContextValue'
import type { AuthContextValue } from '@/shared/contexts/AuthContextValue'
import { clearTokens, getRefreshToken, getStoredUser, setStoredUser, setTokens } from '@/shared/services/auth.service'
import type { LoginPayload, RegisterPayload, UpdateProfilePayload, User } from '@/shared/types/user'

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(() => getStoredUser())
	const [isSessionLoading, setIsSessionLoading] = useState<boolean>(() => getRefreshToken() !== null)

	// Validate a stored session against GET /auth/me on startup so protected
	// pages never flash for a dead session.
	useEffect(() => {
		if (!getRefreshToken()) {
			setIsSessionLoading(false)
			return
		}
		let cancelled = false
		authApi
			.getCurrentUser()
			.then((freshUser) => {
				if (cancelled) return
				setStoredUser(freshUser)
				setUser(freshUser)
			})
			.catch(() => {
				if (cancelled) return
				clearTokens()
				setStoredUser(null)
				setUser(null)
			})
			.finally(() => {
				if (!cancelled) setIsSessionLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [])

	// The API client emits this when tokens are cleared after a fatal 401/403.
	useEffect(() => {
		const handleSessionExpired = () => {
			setStoredUser(null)
			setUser(null)
		}
		window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
		return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
	}, [])

	const login = async (payload: LoginPayload): Promise<void> => {
		const response = await authApi.login(payload)
		setTokens(response.access_token, response.refresh_token)
		setStoredUser(response.user)
		setUser(response.user)
	}

	const register = async (payload: RegisterPayload): Promise<void> => {
		const response = await authApi.register(payload)
		setTokens(response.access_token, response.refresh_token)
		setStoredUser(response.user)
		setUser(response.user)
	}

	const updateProfile = async (changes: UpdateProfilePayload): Promise<void> => {
		if (!user) throw new Error('No signed-in user is available.')
		const updatedUser = await authApi.updateProfile(user.id, changes)
		setStoredUser(updatedUser)
		setUser(updatedUser)
	}

	const logout = useCallback(async (): Promise<void> => {
		try {
			await authApi.logout()
		} finally {
			clearTokens()
			setStoredUser(null)
			setUser(null)
		}
	}, [])

	const value: AuthContextValue = {
		user,
		role: user?.role ?? null,
		isAuthenticated: user !== null,
		isSessionLoading,
		login,
		register,
		updateProfile,
		logout,
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
