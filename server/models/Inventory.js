import mongoose from 'mongoose'

const inventorySchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
)

inventorySchema.index({ productId: 1, size: 1 }, { unique: true })

export default mongoose.model('Inventory', inventorySchema)
