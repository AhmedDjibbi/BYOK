import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import Inventory from '../../server/models/Inventory.js'
import Order from '../../server/models/Order.js'
import Product from '../../server/models/Product.js'
import { expirePendingOrders } from '../../server/jobs/expireOrders.js'

const baseUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/byok'
let dbName

beforeAll(async () => {
  const url = new URL(baseUri)
  dbName = `byok_expiry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  url.pathname = `/${dbName}`
  await mongoose.connect(url.toString(), { serverSelectionTimeoutMS: 5000 })
}, 30000)

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
}, 30000)

beforeEach(async () => {
  await Product.deleteMany({})
  await Inventory.deleteMany({})
  await Order.deleteMany({})
  await Product.create({
    productId: 'test-tee-black',
    name: 'Test Tee',
    price: 79,
    category: 'tshirts',
    badge: 'New',
    garment: { type: 'tee', body: '#131313', trim: '#3a3a3a', print: 'logo' },
    colors: ['#1c1c1c'],
    activeColor: 0,
    sizes: ['S', 'M'],
    color: '#1c1c1c',
    colorway: 'Black',
    added: 0,
  })
  await Inventory.create({ productId: 'test-tee-black', size: 'M', quantity: 0 })
})

function expiredOrder(email, expiresAt = new Date(Date.now() - 1000), status = 'pending') {
  return {
    customer: {
      name: 'Test User',
      email,
      phone: '+21600000000',
      address: 'Rue 1',
      city: 'Tunis',
    },
    items: [
      {
        productId: 'test-tee-black',
        name: 'Test Tee',
        colorway: 'Black',
        size: 'M',
        unitPrice: 79,
        quantity: 1,
      },
    ],
    total: 79,
    status,
    expiresAt,
  }
}

describe('order expiration job', () => {
  it('cancels an expired pending order and restores stock once', async () => {
    await Order.create(expiredOrder('a@example.com'))

    const cancelled = await expirePendingOrders()
    expect(cancelled).toBe(1)

    const order = await Order.findOne({ 'customer.email': 'a@example.com' }).lean()
    expect(order.status).toBe('cancelled')
    expect(order.cancelReason).toBe('expired')
    expect(order.stockReleasedAt).toBeTruthy()
    expect(order.statusHistory.at(-1).status).toBe('cancelled')

    const stock = await Inventory.findOne({ productId: 'test-tee-black', size: 'M' }).lean()
    expect(stock.quantity).toBe(1)
  })

  it('does not double-restore stock on a second run', async () => {
    await Order.create(expiredOrder('b@example.com'))

    await expirePendingOrders()
    await expirePendingOrders()

    const stock = await Inventory.findOne({ productId: 'test-tee-black', size: 'M' }).lean()
    expect(stock.quantity).toBe(1)
  })

  it('does not expire an order whose deadline is in the future', async () => {
    await Order.create(
      expiredOrder('future@example.com', new Date(Date.now() + 60 * 60 * 1000)),
    )

    const cancelled = await expirePendingOrders()
    expect(cancelled).toBe(0)

    const stock = await Inventory.findOne({ productId: 'test-tee-black', size: 'M' }).lean()
    expect(stock.quantity).toBe(0)

    const order = await Order.findOne({ 'customer.email': 'future@example.com' }).lean()
    expect(order.status).toBe('pending')
  })

  it('recovers stock that was not released before a restart', async () => {
    const order = await Order.create(
      expiredOrder('stuck@example.com', new Date(Date.now() - 1000), 'cancelled'),
    )
    // Simulate a cancellation that never got as far as releasing stock.
    await Order.updateOne(
      { _id: order._id },
      { $set: { cancelReason: 'expired', stockReleasedAt: null } },
    )

    await expirePendingOrders()

    const refreshed = await Order.findById(order._id).lean()
    expect(refreshed.stockReleasedAt).toBeTruthy()
    const stock = await Inventory.findOne({ productId: 'test-tee-black', size: 'M' }).lean()
    expect(stock.quantity).toBe(1)
  })
})
