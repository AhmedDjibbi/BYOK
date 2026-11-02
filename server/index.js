import 'dotenv/config'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import adminRouter from './routes/admin.js'
import apiRouter from './routes/api.js'
import { logNotificationConfiguration } from './services/notifications.js'

const serverDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(serverDirectory, '..')
const app = express()
const port = Number(process.env.PORT) || 3000
const mongoUri = process.env.MONGODB_URI
const proxyHops = process.env.TRUST_PROXY
  ? Number.parseInt(process.env.TRUST_PROXY, 10)
  : null

if (!mongoUri) {
  console.error('MONGODB_URI is required. Copy .env.example to .env and configure it.')
  process.exit(1)
}
if (proxyHops !== null && (!Number.isInteger(proxyHops) || proxyHops < 1)) {
  console.error('TRUST_PROXY must be a positive number of trusted proxy hops.')
  process.exit(1)
}
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.ADMIN_API_TOKEN || process.env.ADMIN_API_TOKEN.length < 32)
) {
  console.error('Set ADMIN_API_TOKEN to a random secret of at least 32 characters in production.')
  process.exit(1)
}

app.disable('x-powered-by')
app.use(helmet({ contentSecurityPolicy: false }))
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', proxyHops)
}
app.use(express.json({ limit: '20kb' }))
app.use('/api/admin', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many staff API requests. Please try again later.' },
}))
app.use('/api/admin', adminRouter)
app.use('/api', apiRouter)

const distDirectory = resolve(projectDirectory, 'dist')
if (existsSync(distDirectory)) {
  app.use(express.static(distDirectory))
  app.get(/.*/, (request, response, next) => {
    if (request.path.startsWith('/api/')) return next()
    response.sendFile(resolve(distDirectory, 'index.html'))
  })
}

app.use((_request, response) => {
  response.status(404).json({ error: 'Route not found.' })
})

app.use((error, _request, response, _next) => {
  console.error(`API error: ${error.message}`)
  if (response.headersSent) return
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500
  response.status(status).json({
    error: status < 500 ? 'The request could not be processed.' : 'The server could not complete this request.',
  })
})

try {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
  logNotificationConfiguration()
  const server = app.listen(port, () => {
    console.log(`BYOK API listening on http://localhost:${port}`)
  })

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => {
        mongoose.disconnect().then(() => process.exit(0))
      })
    })
  }
} catch (error) {
  console.error(`Could not connect to MongoDB: ${error.message}`)
  process.exitCode = 1
}
