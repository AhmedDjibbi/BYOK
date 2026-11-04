import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    userAgent: { type: String, trim: true, default: '' },
    ip: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

export default mongoose.model('Session', sessionSchema)
