import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    unsubscribeToken: { type: String, unique: true, sparse: true, trim: true },
    status: {
      type: String,
      enum: ['subscribed', 'unsubscribed'],
      default: 'subscribed',
    },
    unsubscribedAt: { type: Date },
  },
  { timestamps: true },
)

subscriberSchema.statics.generateUnsubscribeToken = function generateUnsubscribeToken() {
  return randomBytes(32).toString('hex')
}

export default mongoose.model('Subscriber', subscriberSchema)
