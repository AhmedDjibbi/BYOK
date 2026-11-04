import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, index: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    body: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending' },
    verifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true },
)

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true })

export default mongoose.model('Review', reviewSchema)
