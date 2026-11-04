import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import adminRouter from './routes/admin.js'
import apiRouter from './routes/api.js'
import authRouter from './routes/auth.js'
import accountRouter from './routes/account.js'
import { config } from './config.js'
import { createRateLimitMiddleware } from './rateLimitStore.js'

const requestIdPattern = /^[A-Za-z0-9._-]{1,64}$/

const isDevelopment = config.environment === 'development'

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
}

export function createApp({ distDirectory = null } = {}) {
  const app = express()

  const allowedOrigins = config.allowedOrigins
  app.use(
    cors({
      origin:
        allowedOrigins.length > 0
          ? (origin, callback) => {
              if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
              callback(new Error('Origin is not allowed by CORS.'))
            }
          : false,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    }),
  )

  app.disable('x-powered-by')
  app.use(
    helmet({
      contentSecurityPolicy: isDevelopment ? false : { directives: cspDirectives },
    }),
  )
  if (config.trustProxy) {
    app.set('trust proxy', config.trustProxy)
  }
  app.use((request, response, next) => {
    const suppliedId = request.get('x-request-id')
    const requestId =
      suppliedId && requestIdPattern.test(suppliedId) ? suppliedId : randomUUID()
    request.id = requestId
    response.setHeader('X-Request-Id', requestId)

    const startedAt = process.hrtime.bigint()
    response.on('finish', () => {
      const durationMs = Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6)
      const entry = JSON.stringify({
        level: response.statusCode >= 500 ? 'error' : 'info',
        requestId,
        method: request.method,
        path: request.originalUrl,
        status: response.statusCode,
        durationMs,
      })
      if (response.statusCode >= 500) console.error(entry)
      else console.log(entry)
    })

    next()
  })
  app.use(cookieParser())
  app.use(express.json({ limit: '20kb' }))
  app.use(
    '/api/admin',
    createRateLimitMiddleware({
      prefix: 'rl:admin:global',
      windowMs: 15 * 60 * 1000,
      limit: 120,
      message: { error: 'Too many staff API requests. Please try again later.' },
    }),
  )
  app.use('/api/admin', adminRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/account', accountRouter)
  app.use('/api', apiRouter)

  if (distDirectory && existsSync(distDirectory)) {
    app.use(express.static(distDirectory))
    app.get(/.*/, (request, response, next) => {
      if (request.path.startsWith('/api/')) return next()
      response.sendFile(resolve(distDirectory, 'index.html'))
    })
  }

  app.use((request, response) => {
    response.status(404).json({ error: 'Route not found.', requestId: request.id })
  })

  app.use((error, request, response, _next) => {
    console.error(`API error ${request.id}: ${error.message}`)
    if (response.headersSent) return
    const status =
      Number.isInteger(error.status) && error.status >= 400 && error.status < 500
        ? error.status
        : 500
    response.status(status).json({
      error:
        status < 500
          ? 'The request could not be processed.'
          : 'The server could not complete this request.',
      requestId: request.id,
    })
  })

  return app
}
