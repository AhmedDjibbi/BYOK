/* ==========================================================================
   Vercel serverless entrypoint.

   `api/[...path].js` receives every request under /api/*. Vercel keeps the
   original path, and server/app.js already mounts its routers at /api, so the
   request is handed to Express untouched. The connection is cached per warm
   instance by server/db.js.
   ========================================================================== */

import { createApp } from '../server/app.js'
import { config } from '../server/config.js'
import { connectToDatabase } from '../server/db.js'

const app = createApp({ distDirectory: null })
let warnedAboutRedis = false

export default async function handler(request, response) {
  try {
    if (!request.url?.startsWith('/api')) {
      request.url = `/api${request.url ?? ''}`
    }
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
