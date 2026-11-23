import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/shared/services/auth.service'

export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api/v1'

export interface ApiErrorDetail {
  field: string
  message: string
}

/** Error shape from API_CONTRACT.md section 1. */
export class ApiError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: ApiErrorDetail[]

  constructor(statusCode: number, code: string, message: string, details?: ApiErrorDetail[]) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export const NETWORK_ERROR_CODE = 'NETWORK_ERROR'
export const SESSION_EXPIRED_EVENT = 'crown-anchor:session-expired'

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh']

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  /** Set for multipart uploads; fetch sets the boundary itself. */
  formData?: FormData
  /** Attach the stored access token (default true for non-public calls). */
  auth?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_URL}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

function notifySessionExpired(): void {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

function isSessionEndingError(error: ApiError): boolean {
  return (
    error.code === 'UNAUTHORIZED' ||
    error.code === 'INVALID_REFRESH_TOKEN' ||
    error.code === 'ACCOUNT_SUSPENDED'
  )
}

let refreshInFlight: Promise<boolean> | null = null

/**
 * Single-flight refresh: concurrent 401s share one POST /auth/refresh.
 * Returns true when new tokens were stored, false when the session is dead.
 */
function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) return false
      try {
        const response = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
        if (!response.ok) return false
        const data = (await response.json()) as {
          access_token: string
          refresh_token: string
        }
        setTokens(data.access_token, data.refresh_token)
        return true
      } catch {
        return false
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

async function parseError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as {
    statusCode?: number
    code?: string
    message?: string
    details?: ApiErrorDetail[]
  } | null
  return new ApiError(
    body?.statusCode ?? response.status,
    body?.code ?? 'UNKNOWN_ERROR',
    body?.message ?? `Request failed with status ${response.status}`,
    body?.details,
  )
}

async function send(path: string, options: RequestOptions, retried: boolean): Promise<unknown> {
  const headers: Record<string, string> = {}
  const token = options.auth === false ? null : getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (options.formData) {
    body = options.formData
  } else {
    headers['Content-Type'] = 'application/json'
    body = options.body === undefined ? undefined : JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body,
    })
  } catch {
    throw new ApiError(0, NETWORK_ERROR_CODE, 'Network error. Please check your connection.')
  }

  if (response.status === 204) return undefined

  if (!response.ok) {
    const error = await parseError(response)

    if (
      !retried &&
      response.status === 401 &&
      error.code === 'TOKEN_EXPIRED' &&
      !AUTH_PATHS.includes(path)
    ) {
      const refreshed = await refreshSession()
      if (refreshed) return send(path, options, true)
      clearTokens()
      notifySessionExpired()
      throw error
    }

    if (isSessionEndingError(error)) {
      clearTokens()
      notifySessionExpired()
    }
    throw error
  }

  const text = await response.text()
  return text ? (JSON.parse(text) as unknown) : undefined
}

/** Typed JSON client for the NestJS API. See API_CONTRACT.md for shapes. */
export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await send(path, options, false)) as T
}

/** Human-readable message for anything thrown by apiRequest or fetch wrappers. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}
