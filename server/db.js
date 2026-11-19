import mongoose from 'mongoose'
import { config } from './config.js'

let pendingConnection = null

/**
 * Shared MongoDB connection for long-running servers and serverless functions.
 * Reuses an established connection and de-duplicates concurrent attempts, so a
 * cold serverless invocation opens at most one connection.
 */
export async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection
  if (!config.mongoUri) throw new Error('MONGODB_URI is not configured.')

  if (!pendingConnection) {
    pendingConnection = mongoose
      .connect(config.mongoUri, { serverSelectionTimeoutMS: 15000 })
      .then((instance) => instance.connection)
      .finally(() => {
        pendingConnection = null
      })
  }

  return pendingConnection
}
