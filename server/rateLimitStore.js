import rateLimit from 'express-rate-limit'
import { createClient } from 'redis'
import { RedisStore } from 'rate-limit-redis'
import { config } from './config.js'

let redisClientPromise
let redisAvailable
let warningGiven = false

function warn(message) {
  if (warningGiven) return
  warningGiven = true
  console.warn(`Rate limiting will use the in-memory store: ${message}`)
}

async function getRedisClient() {
  if (!config.redisUrl) {
    if (!config.isProduction) warn('REDIS_URL is not set.')
    return null
  }

  if (redisClientPromise) return redisClientPromise
  redisClientPromise = (async () => {
    const client = createClient({ url: config.redisUrl })
    client.on('error', () => {
      // Errors are handled at connection time and reported by callers.
    })
    try {
      await client.connect()
      redisAvailable = true
      return client
    } catch (error) {
      redisAvailable = false
      warn(error.message)
      try {
        await client.disconnect()
      } catch {
        // Ignore cleanup errors.
      }
      return null
    }
  })()
  return redisClientPromise
}

export async function getRateLimitStoreType() {
  if (!config.redisUrl) {
    redisAvailable = false
    return 'memory'
  }
  const client = await getRedisClient()
  return client ? 'redis' : 'memory'
}

export function createRateLimitMiddleware(options = {}) {
  const { prefix = 'rl', ...limitOptions } = options
  let middlewarePromise

  const buildMiddleware = async () => {
    const client = await getRedisClient()
    const store = client
      ? new RedisStore({ client, prefix })
      : undefined
    return rateLimit({
      standardHeaders: true,
      legacyHeaders: false,
      ...limitOptions,
      ...(store ? { store } : {}),
    })
  }

  return function rateLimitMiddleware(request, response, next) {
    if (!middlewarePromise) middlewarePromise = buildMiddleware()
    middlewarePromise
      .then((middleware) => middleware(request, response, next))
      .catch(next)
  }
}
