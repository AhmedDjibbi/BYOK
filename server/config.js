import 'dotenv/config'

export class ConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ConfigError'
  }
}

const parseCommaList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const readString = (name, fallback = '') => (process.env[name] ?? fallback).trim()

const readInteger = (name, fallback, { min, max } = {}) => {
  const raw = readString(name)
  if (!raw) return fallback
  const value = Number(raw)
  if (
    !Number.isInteger(value) ||
    (min !== undefined && value < min) ||
    (max !== undefined && value > max)
  ) {
    const range =
      min !== undefined && max !== undefined
        ? ` between ${min} and ${max}`
        : min !== undefined
          ? ` of at least ${min}`
          : ''
    throw new ConfigError(`${name} must be a whole number${range}.`)
  }
  return value
}

const readNumber = (name, fallback, { min, max } = {}) => {
  const raw = readString(name)
  if (!raw) return fallback
  const value = Number(raw)
  if (
    !Number.isFinite(value) ||
    (min !== undefined && value < min) ||
    (max !== undefined && value > max)
  ) {
    const range =
      min !== undefined && max !== undefined
        ? ` between ${min} and ${max}`
        : min !== undefined
          ? ` of at least ${min}`
          : ''
    throw new ConfigError(`${name} must be a number${range}.`)
  }
  return value
}

const readUrl = (name) => {
  const raw = readString(name)
  if (!raw) return ''
  try {
    const url = new URL(raw)
    return url.toString()
  } catch {
    throw new ConfigError(`${name} must be a valid URL.`)
  }
}

const environment = readString('NODE_ENV', 'development')
const shippingMode = readString('SHIPPING_MODE', 'fixed').toLowerCase()

if (!['fixed', 'percentage'].includes(shippingMode)) {
  throw new ConfigError("SHIPPING_MODE must be either 'fixed' or 'percentage'.")
}

export const config = Object.freeze({
  environment,
  isProduction: environment === 'production',
  port: readInteger('PORT', 3000, { min: 1, max: 65535 }),
  mongoUri: readString('MONGODB_URI'),
  adminApiToken: readString('ADMIN_API_TOKEN'),
  adminApiTokens: parseCommaList(readString('ADMIN_API_TOKENS')),
  allowedOrigins: parseCommaList(readString('ALLOWED_ORIGINS')),
  trustProxy: readString('TRUST_PROXY')
    ? readInteger('TRUST_PROXY', null, { min: 1 })
    : null,
  backupDir: readString('BACKUP_DIR', 'backups'),
  redisUrl: readUrl('REDIS_URL'),
  shipping: Object.freeze({
    mode: shippingMode,
    value: readNumber('SHIPPING_VALUE', 0, {
      min: 0,
      max: shippingMode === 'percentage' ? 100 : undefined,
    }),
    currency: readString('SHIPPING_CURRENCY', 'TND').toUpperCase(),
  }),
  pendingOrderTtlHours: readInteger('PENDING_ORDER_TTL_HOURS', 72, {
    min: 1,
    max: 720,
  }),
  lowStockThreshold: readInteger('LOW_STOCK_THRESHOLD', 5, { min: 0 }),
})

export function assertRuntimeConfig() {
  if (!config.mongoUri) {
    throw new ConfigError(
      'MONGODB_URI is required. Copy .env.example to .env and configure it.',
    )
  }

  const hasAdminToken = [...config.adminApiTokens, config.adminApiToken].some(Boolean)
  if (!hasAdminToken) {
    throw new ConfigError('Set ADMIN_API_TOKEN or ADMIN_API_TOKENS to protect the staff API.')
  }

  if (config.isProduction && config.adminApiTokens.concat(config.adminApiToken).filter(Boolean).some((token) => token.length < 32)) {
    throw new ConfigError(
      'Set ADMIN_API_TOKEN or ADMIN_API_TOKENS to a random secret of at least 32 characters in production.',
    )
  }

  if (config.isProduction && !config.redisUrl) {
    throw new ConfigError('REDIS_URL is required in production for shared rate limits.')
  }
}
