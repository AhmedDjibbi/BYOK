import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import ContactMessage from '../models/ContactMessage.js'
import Inventory from '../models/Inventory.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Subscriber from '../models/Subscriber.js'
import { getNotificationConfiguration, sendNotifications } from '../services/notifications.js'

const router = Router()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^[+0-9][0-9\s()-]{6,19}$/
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order attempts. Please try again later.' },
})
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please try again later.' },
})
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many subscription attempts. Please try again later.' },
})

router.get('/health/live', (_request, response) => {
  response.json({ status: 'ok' })
})

router.get('/health', (_request, response) => {
  const ready = mongoose.connection.readyState === 1
  response.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'unavailable',
    database: ready ? 'connected' : 'disconnected',
    notifications: getNotificationConfiguration(),
    staffApi: process.env.ADMIN_API_TOKEN ? 'configured' : 'not_configured',
  })
})

router.get('/products', async (_request, response, next) => {
  try {
    const [products, inventory] = await Promise.all([
      Product.find().sort({ added: 1 }).lean(),
      Inventory.find().lean(),
    ])
    const quantities = new Map(
      inventory.map((item) => [`${item.productId}::${item.size}`, item.quantity]),
    )
    response.json({
      products: products.map((product) => ({
        id: product.productId,
        name: product.name,
        price: product.price,
        category: product.category,
        badge: product.badge,
        garment: product.garment,
        colors: product.colors,
        activeColor: product.activeColor,
        sizes: product.sizes,
        color: product.color,
        colorway: product.colorway,
        added: product.added,
        stockBySize: Object.fromEntries(
          product.sizes.map((size) => [
            size,
            quantities.get(`${product.productId}::${size}`) ?? 0,
          ]),
        ),
      })),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/orders', orderLimiter, async (request, response, next) => {
  try {
    const { customer, items } = request.body ?? {}
    if (typeof request.body?.website === 'string' && request.body.website.trim()) {
      return response.status(202).json({ message: 'Your order has been received.' })
    }
    const name = typeof customer?.name === 'string' ? customer.name.trim() : ''
    const email = typeof customer?.email === 'string' ? customer.email.trim().toLowerCase() : ''
    const phone = typeof customer?.phone === 'string' ? customer.phone.trim() : ''
    const address = typeof customer?.address === 'string' ? customer.address.trim() : ''
    const city = typeof customer?.city === 'string' ? customer.city.trim() : ''

    if (
      name.length < 2 ||
      name.length > 100 ||
      !emailPattern.test(email) ||
      !phonePattern.test(phone) ||
      address.length < 5 ||
      address.length > 200 ||
      city.length < 2 ||
      city.length > 100
    ) {
      return response.status(400).json({ error: 'Please provide valid delivery details.' })
    }

    if (
      !Array.isArray(items) ||
      items.length < 1 ||
      items.length > 30 ||
      items.some(
        (item) =>
          typeof item?.productId !== 'string' ||
          !item.productId.trim() ||
          typeof item.size !== 'string' ||
          !item.size.trim() ||
          item.size.length > 20 ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 10,
      )
    ) {
      return response.status(400).json({ error: 'Your bag contains invalid items.' })
    }

    const quantities = new Map()
    for (const item of items) {
      const key = `${item.productId}::${item.size.trim()}`
      quantities.set(key, (quantities.get(key) ?? 0) + item.quantity)
    }
    if ([...quantities.values()].some((quantity) => quantity > 10)) {
      return response.status(400).json({ error: 'Each item is limited to 10 units per order.' })
    }

    const productIds = [...new Set(items.map((item) => item.productId))]
    const products = await Product.find({ productId: { $in: productIds } }).lean()
    if (products.length !== productIds.length) {
      return response.status(400).json({ error: 'One or more products are no longer available.' })
    }

    const productsById = new Map(products.map((product) => [product.productId, product]))
    const orderItems = [...quantities].map(([key, quantity]) => {
      const separatorIndex = key.lastIndexOf('::')
      const productId = key.slice(0, separatorIndex)
      const size = key.slice(separatorIndex + 2)
      const product = productsById.get(productId)

      if (!product || !product.sizes.includes(size)) return null

      return {
        productId: product.productId,
        name: product.name,
        colorway: product.colorway,
        size,
        unitPrice: product.price,
        quantity,
      }
    })
    if (orderItems.some((item) => item === null)) {
      return response.status(400).json({ error: 'One or more selected sizes are unavailable.' })
    }
    const reserved = []
    let unavailable = false
    try {
      for (const item of orderItems) {
        const stock = await Inventory.findOneAndUpdate(
          {
            productId: item.productId,
            size: item.size,
            quantity: { $gte: item.quantity },
          },
          { $inc: { quantity: -item.quantity } },
          { returnDocument: 'after' },
        )
        if (!stock) {
          unavailable = true
          break
        }
        reserved.push(item)
      }
    } catch (error) {
      if (reserved.length > 0) {
        await Inventory.bulkWrite(
          reserved.map((item) => ({
            updateOne: {
              filter: { productId: item.productId, size: item.size },
              update: { $inc: { quantity: item.quantity } },
            },
          })),
        )
      }
      throw error
    }

    if (unavailable) {
      if (reserved.length > 0) {
        await Inventory.bulkWrite(
          reserved.map((item) => ({
            updateOne: {
              filter: { productId: item.productId, size: item.size },
              update: { $inc: { quantity: item.quantity } },
            },
          })),
        )
      }
      return response.status(409).json({ error: 'One or more selected sizes are out of stock.' })
    }

    const total = orderItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    )
    let order
    try {
      order = await Order.create({
        customer: { name, email, phone, address, city },
        items: orderItems,
        total,
      })
    } catch (error) {
      await Inventory.bulkWrite(
        reserved.map((item) => ({
          updateOne: {
            filter: { productId: item.productId, size: item.size },
            update: { $inc: { quantity: item.quantity } },
          },
        })),
      )
      throw error
    }

    const notification = await sendNotifications({
      subject: `New BYOK order ${order._id}`,
      text: `New pending cash-on-delivery order ${order._id} from ${name}. Total: ${total} TND.`,
      customerEmail: email,
      customerPhone: phone,
    })

    response.status(201).json({
      orderId: order._id.toString(),
      total: order.total,
      status: order.status,
      notification,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/newsletter', newsletterLimiter, async (request, response, next) => {
  try {
    if (typeof request.body?.website === 'string' && request.body.website.trim()) {
      return response.status(200).json({ message: 'Subscription saved.' })
    }
    const email =
      typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    if (email.length > 254 || !emailPattern.test(email)) {
      return response.status(400).json({ error: 'Please enter a valid email address.' })
    }

    await Subscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true })
    response.status(200).json({ message: 'Subscription saved.' })
  } catch (error) {
    next(error)
  }
})

router.post('/contact', contactLimiter, async (request, response, next) => {
  try {
    if (typeof request.body?.website === 'string' && request.body.website.trim()) {
      return response.status(202).json({ message: 'Your message has been received.' })
    }
    const { name, email, subject, message } = request.body ?? {}
    const contact = {
      name: typeof name === 'string' ? name.trim() : '',
      email: typeof email === 'string' ? email.trim().toLowerCase() : '',
      subject: typeof subject === 'string' ? subject.trim() : '',
      message: typeof message === 'string' ? message.trim() : '',
    }

    if (
      contact.name.length < 2 ||
      contact.name.length > 100 ||
      contact.email.length > 254 ||
      !emailPattern.test(contact.email) ||
      contact.subject.length < 3 ||
      contact.subject.length > 120 ||
      contact.message.length < 10 ||
      contact.message.length > 2000
    ) {
      return response.status(400).json({ error: 'Please complete all fields with valid details.' })
    }

    const savedMessage = await ContactMessage.create(contact)
    const notification = await sendNotifications({
      subject: `New BYOK contact message: ${contact.subject}`,
      text: `From: ${contact.name} <${contact.email}>\n\n${contact.message}`,
      customerEmail: contact.email,
    })
    response.status(201).json({
      message: 'Your message has been received.',
      messageId: savedMessage._id.toString(),
      notification,
    })
  } catch (error) {
    next(error)
  }
})

export default router
