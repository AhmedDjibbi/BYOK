/* ==========================================================================
   Vercel serverless entrypoint.

   Vercel deploys each file in /api as a function, but it does not support
   catch-all filenames such as [...path].js for plain functions. So this single
   function serves the whole API, and vercel.json rewrites /api/* to it while
   passing the original subpath as `__path`.
   ========================================================================== */

import { createApp } from '../server/app.js'
import { config } from '../server/config.js'
import { connectToDatabase } from '../server/db.js'

const app = createApp({ distDirectory: null })
let warnedAboutRedis = false

function restoreApiPath(request) {
  if (!request.url) {
    request.url = '/api'
    return
  }

  const target = new URL(request.url, 'http://localhost')
  const forwarded = target.searchParams.get('__path')

  if (forwarded === null) {
    if (!request.url.startsWith('/api')) request.url = `/api${request.url}`
    return
  }

  target.searchParams.delete('__path')
  const suffix = forwarded.replace(/^\/+/, '')
  request.url = `/api/${suffix}${target.search}`
}

export default async function handler(request, response) {
  try {
    restoreApiPath(request)

    if (!config.redisUrl && !warnedAboutRedis) {
      warnedAboutRedis = true
      console.warn('REDIS_URL is not set; rate limits are per serverless instance.')
    }

    await connectToDatabase()
    return app(request, response)
  } catch (error) {
    console.error(`API request failed: ${error.message}`)
    if (!response.headersSent) {
      response.status(503).json({ error: 'The store API is temporarily unavailable.' })
    }
  }
}
