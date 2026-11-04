import mongoose from 'mongoose'

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: 'Home' },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
)

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
    name: { type: String, trim: true, default: '' },
    passwordHash: { type: String, select: false },
    emailVerifiedAt: { type: Date },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    addresses: { type: [addressSchema], default: [] },
    wishlist: { type: [String], default: [] },
  },
  { timestamps: true },
)

userSchema.set('toJSON', {
  transform: (_document, result) => {
    delete result.passwordHash
    return result
  },
})

export default mongoose.model('User', userSchema)
