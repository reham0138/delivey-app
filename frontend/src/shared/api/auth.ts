import { apiRequest, ApiError } from '@/shared/api/client'
import { getRefreshToken } from '@/shared/services/auth.service'
import type { AuthResponse, LoginPayload, RegisterPayload, UpdateProfilePayload, User } from '@/shared/types/user'

interface AuthUserResponse {
  access_token: string
  refresh_token: string
  user: User
}

function toAuthResponse(data: AuthUserResponse): AuthResponse {
  return { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user }
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const data = await apiRequest<AuthUserResponse>('/auth/login', {
    method: 'POST',
    body: { email: payload.email.trim(), password: payload.password },
  })
  return toAuthResponse(data)
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const data = await apiRequest<AuthUserResponse>('/auth/register', {
    method: 'POST',
    body: {
      name: payload.name.trim(),
      email: payload.email.trim(),
      password: payload.password,
      ...(payload.phone ? { phone: payload.phone } : {}),
      role: payload.role,
    },
  })
  return toAuthResponse(data)
}

export async function updateProfile(_userId: string, changes: UpdateProfilePayload): Promise<User> {
  return apiRequest<User>('/users/me', {
    method: 'PATCH',
    body: {
      name: changes.name.trim(),
      ...(changes.phone?.trim() ? { phone: changes.phone.trim() } : {}),
    },
  })
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  try {
    if (refreshToken) {
      await apiRequest('/auth/logout', { method: 'POST', body: { refresh_token: refreshToken } })
    }
  } finally {
    // Session is cleared by the caller regardless of the request outcome.
  }
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>('/auth/me')
}

/** Maps backend error codes to stable i18n keys (English source strings). */
export function authErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid email or password.'
      case 'EMAIL_ALREADY_EXISTS':
        return 'An account with this email already exists.'
      case 'ACCOUNT_SUSPENDED':
        return 'This account has been suspended.'
      case 'TOO_MANY_REQUESTS':
        return 'Too many attempts. Please try again later.'
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection.'
      case 'VALIDATION_ERROR':
        return 'Please check the form and try again.'
    }
  }
  return 'Something went wrong. Please try again.'
}
