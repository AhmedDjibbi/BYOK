import mongoose from 'mongoose'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { assertRuntimeConfig, config } from './config.js'
import { logNotificationConfiguration } from './services/notifications.js'
import { ensureCollections } from './services/collections.js'
import { startOrderExpirationJob } from './jobs/expireOrders.js'

try {
  assertRuntimeConfig()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const app = createApp({ distDirectory: resolve(projectDirectory, 'dist') })

try {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 })
  logNotificationConfiguration()
  await ensureCollections()
  const stopExpiration = startOrderExpirationJob()
  const server = app.listen(config.port, () => {
    console.log(`BYOC API listening on http://localhost:${config.port}`)
  })

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => {
        stopExpiration()
        mongoose.disconnect().then(() => process.exit(0))
      })
    })
  }
} catch (error) {
  console.error(`Could not connect to MongoDB: ${error.message}`)
  process.exitCode = 1
}
