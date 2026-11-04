import mongoose from 'mongoose'

const loginTokenSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    usedAt: { type: Date },
  },
  { timestamps: true },
)

export default mongoose.model('LoginToken', loginTokenSchema)
