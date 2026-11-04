import mongoose from 'mongoose'
import { config } from '../config.js'

const orderSchema = new mongoose.Schema(
  {
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
    },
    items: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        colorway: { type: String, required: true },
        size: { type: String, required: true },
        unitPrice: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1, max: 10 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0, default: 0 },
    shippingFee: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    shippingSnapshot: {
      mode: { type: String, enum: ['fixed', 'percentage'] },
      value: { type: Number },
      currency: { type: String },
      globalBase: { type: Number },
      overrideTotal: { type: Number },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'fulfilled'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () =>
        new Date(Date.now() + config.pendingOrderTtlHours * 60 * 60 * 1000),
    },
    cancelReason: { type: String, trim: true },
    stockReleasedAt: { type: Date },
    statusHistory: {
      type: [
        {
          status: { type: String, required: true },
          at: { type: Date, required: true, default: Date.now },
          note: { type: String, trim: true },
        },
      ],
      default: () => [{ status: 'pending', at: new Date(), note: 'Order placed' }],
    },
  },
  { timestamps: true },
)

orderSchema.index({ status: 1, expiresAt: 1 })
orderSchema.index({ status: 1, cancelReason: 1, stockReleasedAt: 1 })

export default mongoose.model('Order', orderSchema)
