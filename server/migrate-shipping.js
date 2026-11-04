import 'dotenv/config'
import mongoose from 'mongoose'
import Order from './models/Order.js'
import Product from './models/Product.js'

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })

const orders = await Order.find({
  $or: [{ subtotal: { $exists: false } }, { shippingFee: { $exists: false } }],
})
let updatedOrders = 0
for (const order of orders) {
  order.subtotal = order.subtotal ?? order.total
  order.shippingFee = order.shippingFee ?? 0
  order.shippingSnapshot = order.shippingSnapshot || {
    mode: 'fixed',
    value: 0,
    currency: 'TND',
  }
  await order.save()
  updatedOrders += 1
}

const products = await Product.updateMany(
  { shippingOverride: { $exists: false } },
  { $set: { shippingOverride: null } },
)

console.log(`Migrated ${updatedOrders} orders and ${products.modifiedCount} products.`)
await mongoose.disconnect()
