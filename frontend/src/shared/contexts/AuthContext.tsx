import type { ReactNode } from 'react'
import { useState } from 'react'
import * as authApi from '@/shared/api/auth'
import { AuthContext } from '@/shared/contexts/AuthContextValue'
import type { AuthContextValue } from '@/shared/contexts/AuthContextValue'
import { clearTokens, getStoredUser, setStoredUser, setTokens } from '@/shared/services/auth.service'
import type { LoginPayload, RegisterPayload, User } from '@/shared/types/user'

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(() => getStoredUser())

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

	const logout = async (): Promise<void> => {
		try {
			await authApi.logout()
		} finally {
			clearTokens()
			setStoredUser(null)
			setUser(null)
		}
	}

	const value: AuthContextValue = {
		user,
		role: user?.role ?? null,
		isAuthenticated: user !== null,
		login,
		register,
		logout,
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}