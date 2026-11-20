export interface EnvConfig {
  PORT: number
  MONGODB_URI: string
  JWT_ACCESS_SECRET: string
  JWT_ACCESS_TTL: string
  REFRESH_TTL_DAYS: number
  FRONTEND_URL: string
  CLOUDINARY_CLOUD_NAME: string
  CLOUDINARY_API_KEY: string
  CLOUDINARY_API_SECRET: string
  ADMIN_EMAIL: string
  ADMIN_PASSWORD: string
}

const REQUIRED_VARS = [
  'PORT',
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'FRONTEND_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
] as const

// Fail fast at boot if any required variable is missing.
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const missing = REQUIRED_VARS.filter((key) => {
    const value = config[key]
    return value === undefined || value === null || value === ''
  })
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  const port = Number(config.PORT)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  const refreshTtlDays = Number(config.REFRESH_TTL_DAYS ?? 7)
  if (!Number.isFinite(refreshTtlDays) || refreshTtlDays <= 0) {
    throw new Error('REFRESH_TTL_DAYS must be a positive number')
  }

  return {
    PORT: port,
    MONGODB_URI: String(config.MONGODB_URI),
    JWT_ACCESS_SECRET: String(config.JWT_ACCESS_SECRET),
    JWT_ACCESS_TTL: String(config.JWT_ACCESS_TTL ?? '15m'),
    REFRESH_TTL_DAYS: refreshTtlDays,
    FRONTEND_URL: String(config.FRONTEND_URL),
    CLOUDINARY_CLOUD_NAME: String(config.CLOUDINARY_CLOUD_NAME),
    CLOUDINARY_API_KEY: String(config.CLOUDINARY_API_KEY),
    CLOUDINARY_API_SECRET: String(config.CLOUDINARY_API_SECRET),
    ADMIN_EMAIL: String(config.ADMIN_EMAIL),
    ADMIN_PASSWORD: String(config.ADMIN_PASSWORD),
  }
}
