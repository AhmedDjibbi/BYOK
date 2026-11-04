import mongoose from 'mongoose'

const storeSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'store' },
    shipping: {
      mode: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
      value: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'TND', uppercase: true, trim: true },
    },
  },
  { timestamps: true },
)

export default mongoose.model('StoreSetting', storeSettingSchema)
