import { Router } from 'express'
import mongoose from 'mongoose'
import ContactMessage from '../models/ContactMessage.js'
import Inventory from '../models/Inventory.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import requireAdmin from '../middleware/requireAdmin.js'
import { sendNotifications } from '../services/notifications.js'

const router = Router()
const statuses = new Set(['pending', 'confirmed', 'cancelled', 'fulfilled'])

router.use((_request, response, next) => {
  response.set('Cache-Control', 'no-store')
  next()
}, requireAdmin)

router.get('/orders', async (request, response, next) => {
  try {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 25))
    const filter = statuses.has(request.query.status) ? { status: request.query.status } : {}
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ])
    response.json({ orders, page, limit, total })
  } catch (error) {
    next(error)
  }
})

router.get('/contacts', async (request, response, next) => {
  try {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 25))
    const [messages, total] = await Promise.all([
      ContactMessage.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ContactMessage.countDocuments(),
    ])
    response.json({ messages, page, limit, total })
  } catch (error) {
    next(error)
  }
})

router.patch('/orders/:orderId/status', async (request, response, next) => {
  try {
    const { status } = request.body ?? {}
    if (!statuses.has(status) || !mongoose.isValidObjectId(request.params.orderId)) {
      return response.status(400).json({ error: 'Provide a valid order and status.' })
    }

    const order = await Order.findById(request.params.orderId)
    if (!order) return response.status(404).json({ error: 'Order not found.' })
    if (order.status === status) return response.json({ order })

    const allowed = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['cancelled', 'fulfilled'],
      cancelled: [],
      fulfilled: [],
    }
    if (!allowed[order.status].includes(status)) {
      return response.status(409).json({
        error: `An order cannot move from ${order.status} to ${status}.`,
      })
    }

    const previousStatus = order.status
    const changedOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: previousStatus },
      { $set: { status } },
      { returnDocument: 'after', runValidators: true },
    )
    if (!changedOrder) {
      return response.status(409).json({ error: 'The order status changed; refresh and try again.' })
    }

    if (status === 'cancelled') {
      await Inventory.bulkWrite(
        changedOrder.items.map((item) => ({
          updateOne: {
            filter: { productId: item.productId, size: item.size },
            update: { $inc: { quantity: item.quantity } },
          },
        })),
      )
    }

    const notification = await sendNotifications({
      subject: `BYOK order ${changedOrder._id}: ${status}`,
      text: `Your BYOK order ${changedOrder._id} is now ${status}.`,
      customerEmail: changedOrder.customer.email,
      customerPhone: changedOrder.customer.phone,
    })
    response.json({ order: changedOrder, previousStatus, notification })
  } catch (error) {
    next(error)
  }
})

router.get('/inventory', async (_request, response, next) => {
  try {
    const [products, stock] = await Promise.all([
      Product.find().sort({ name: 1, colorway: 1 }).lean(),
      Inventory.find().lean(),
    ])
    const stockBySku = new Map(
      stock.map((item) => [`${item.productId}::${item.size}`, item.quantity]),
    )
    response.json({
      inventory: products.flatMap((product) =>
        product.sizes.map((size) => ({
          productId: product.productId,
          name: product.name,
          colorway: product.colorway,
          size,
          quantity: stockBySku.get(`${product.productId}::${size}`) ?? 0,
        })),
      ),
    })
  } catch (error) {
    next(error)
  }
})

router.put('/inventory/:productId/:size', async (request, response, next) => {
  try {
    const { productId, size } = request.params
    const { quantity, expectedQuantity } = request.body ?? {}
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100000) {
      return response.status(400).json({ error: 'Stock must be a whole number between 0 and 100000.' })
    }
    if (!Number.isInteger(expectedQuantity) || expectedQuantity < 0) {
      return response.status(400).json({ error: 'Refresh inventory before saving a stock change.' })
    }
    const product = await Product.findOne({ productId }).select('sizes').lean()
    if (!product || !product.sizes.includes(size)) {
      return response.status(404).json({ error: 'Product size not found.' })
    }

    const inventory = await Inventory.findOneAndUpdate(
      { productId, size, quantity: expectedQuantity },
      { $set: { quantity } },
      { returnDocument: 'after', runValidators: true },
    )
    if (!inventory) {
      return response.status(409).json({ error: 'Stock changed while you were editing. Refresh and try again.' })
    }
    response.json({ productId, size, quantity: inventory.quantity })
  } catch (error) {
    next(error)
  }
})

export default router
