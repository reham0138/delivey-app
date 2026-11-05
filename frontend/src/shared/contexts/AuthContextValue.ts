import { createContext } from 'react'
import type { LoginPayload, RegisterPayload, Role, UpdateProfilePayload, User } from '@/shared/types/user'

export interface AuthContextValue {
	user: User | null
	role: Role | null
	isAuthenticated: boolean
	login: (payload: LoginPayload) => Promise<void>
	register: (payload: RegisterPayload) => Promise<void>
	updateProfile: (changes: UpdateProfilePayload) => Promise<void>
	logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)