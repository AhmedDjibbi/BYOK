import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    badge: { type: String, default: null },
    garment: { type: mongoose.Schema.Types.Mixed, required: true },
    colors: { type: [String], default: [] },
    activeColor: { type: Number, default: 0 },
    sizes: { type: [String], default: [] },
    color: { type: String, required: true },
    colorway: { type: String, required: true },
    added: { type: Number, required: true },
    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', index: true },
    shippingOverride: { type: Number, min: 0, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export default mongoose.model('Product', productSchema)
