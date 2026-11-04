import { Router } from 'express'
import { createRateLimitMiddleware } from '../rateLimitStore.js'
import mongoose from 'mongoose'
import Collection from '../models/Collection.js'
import ContactMessage from '../models/ContactMessage.js'
import Inventory from '../models/Inventory.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Subscriber from '../models/Subscriber.js'
import { config } from '../config.js'
import Review from '../models/Review.js'
import sessionAuth from '../middleware/sessionAuth.js'
import { getNotificationConfiguration, sendNotifications } from '../services/notifications.js'
import { calculateShipping } from '../services/shipping.js'
import { getRateLimitStoreType } from '../rateLimitStore.js'

const router = Router()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^[+0-9][0-9\s()-]{6,19}$/
const orderLimiter = createRateLimitMiddleware({
  prefix: 'rl:api:orders',
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order attempts. Please try again later.' },
})
const contactLimiter = createRateLimitMiddleware({
  prefix: 'rl:api:contacts',
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please try again later.' },
})
const orderLookupLimiter = createRateLimitMiddleware({
  prefix: 'rl:api:order-lookup',
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order lookups. Please try again later.' },
})
const newsletterLimiter = createRateLimitMiddleware({
  prefix: 'rl:api:newsletter',
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many subscription attempts. Please try again later.' },
})
const newsletterUnsubscribeLimiter = createRateLimitMiddleware({
  prefix: 'rl:api:newsletter-unsubscribe',
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many unsubscribe attempts. Please try again later.' },
})

function unsubscribeHtml(valid, token = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Unsubscribe</title></head>
<body style="font-family:sans-serif;max-width:560px;margin:40px auto;padding:24px;color:#222">
  <h1>Unsubscribe</h1>
  ${
    valid
      ? '<p>Confirm that you want to stop receiving BYOC newsletter emails.</p>'
      : '<p>This unsubscribe link is invalid or has expired.</p>'
  }
  ${
    valid
      ? `<form method="post" action="/api/newsletter/unsubscribe" style="margin-top:16px">
           <input type="hidden" name="token" value="${token}" />
           <button type="submit" style="padding:10px 18px">Unsubscribe</button>
         </form>`
      : ''
  }
</body>
</html>`
}

router.get('/health', async (_request, response) => {
  const ready = mongoose.connection.readyState === 1
  response.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'unavailable',
    database: ready ? 'connected' : 'disconnected',
    notifications: getNotificationConfiguration(),
    staffApi: config.adminApiToken ? 'configured' : 'not_configured',
    rateLimitStore: await getRateLimitStoreType(),
  })
})

router.get('/products', async (request, response, next) => {
  try {
    const [inventory, collections] = await Promise.all([
      Inventory.find().lean(),
      Collection.find().lean(),
    ])
    const collectionById = new Map(collections.map((collection) => [String(collection._id), collection]))
    const requestedCollection = typeof request.query?.collection === 'string'
      ? request.query.collection.trim().toLowerCase()
      : ''
    const filter = {}
    filter.active = { $ne: false }
    if (requestedCollection) {
      const collection = collections.find((item) => item.slug === requestedCollection)
      if (!collection || collection.active === false) {
        return response.json({ products: [] })
      }
      filter.collectionId = collection._id
    }

    const productDocuments = await Product.find(filter).sort({ added: 1 }).lean()
    const quantities = new Map(
      inventory.map((item) => [`${item.productId}::${item.size}`, item.quantity]),
    )
    const ratingAggregation = productDocuments.length
      ? await Review.aggregate([
          {
            $match: {
              productId: { $in: productDocuments.map((product) => product.productId) },
              status: 'published',
            },
          },
          {
            $group: {
              _id: '$productId',
              count: { $sum: 1 },
              average: { $avg: '$rating' },
            },
          },
        ])
      : []
    const ratingsByProduct = new Map(
      ratingAggregation.map((entry) => [
        entry._id,
        {
          count: entry.count,
          average: Number(entry.average?.toFixed?.(1) ?? 0),
        },
      ]),
    )
    response.json({
      products: productDocuments.map((product) => {
        const collection = product.collectionId
          ? collectionById.get(String(product.collectionId))
          : null
        return {
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
          collection: collection
            ? {
                id: collection._id.toString(),
                slug: collection.slug,
                name: collection.name,
              }
            : null,
          shippingOverride: product.shippingOverride ?? null,
          active: product.active,
          ratingAverage: ratingsByProduct.get(product.productId)?.average ?? 0,
          ratingCount: ratingsByProduct.get(product.productId)?.count ?? 0,
        }
      }),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/collections', async (_request, response, next) => {
  try {
    const collections = await Collection.find({ active: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean()
    const counts = await Promise.all(
      collections.map((collection) =>
        Product.countDocuments({ collectionId: collection._id, active: { $ne: false } }).then(
          (count) => ({
            id: collection._id.toString(),
            slug: collection.slug,
            name: collection.name,
            description: collection.description,
            image: collection.image,
            sortOrder: collection.sortOrder,
            productCount: count,
          }),
        ),
      ),
    )
    response.json({ collections: counts })
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

    const shippingConfig = await getShippingConfig()
    const orderItemsWithShipping = orderItems.map((item) => {
      const product = productsById.get(item.productId)
      return {
        ...item,
        shippingOverride:
          product?.shippingOverride === undefined ? null : product.shippingOverride,
      }
    })
    const { subtotal, shippingFee, total, shippingSnapshot } = calculateShipping(
      orderItemsWithShipping,
      shippingConfig,
    )
    let order
    const expiresAt = new Date(
      Date.now() + config.pendingOrderTtlHours * 60 * 60 * 1000,
    )
    try {
      order = await Order.create({
        customer: { name, email, phone, address, city },
        items: orderItems,
        subtotal,
        shippingFee,
        total,
        shippingSnapshot,
        expiresAt,
        statusHistory: [
          {
            status: 'pending',
            at: new Date(),
            note: `Reserved for ${config.pendingOrderTtlHours} hours`,
          },
        ],
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
      subject: `New BYOC order ${order._id}`,
      text: `New pending cash-on-delivery order ${order._id} from ${name}. Total: ${total} TND. Items reserved until ${expiresAt.toLocaleString()}.`,
      customerEmail: email,
      customerPhone: phone,
    })

    response.status(201).json({
      orderId: order._id.toString(),
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
      status: order.status,
      expiresAt: order.expiresAt,
      notification,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/orders/lookup', orderLookupLimiter, async (request, response, next) => {
  try {
    const email =
      typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    const orderId = typeof request.body?.orderId === 'string' ? request.body.orderId.trim() : ''
    if (!orderId || !mongoose.isValidObjectId(orderId) || !emailPattern.test(email)) {
      return response.status(404).json({ error: 'Order not found.' })
    }

    const order = await Order.findOne({ _id: orderId, 'customer.email': email })
      .select('customer.email items total subtotal shippingFee status statusHistory createdAt updatedAt expiresAt cancelReason')
      .lean()
    if (!order) return response.status(404).json({ error: 'Order not found.' })

    response.json({
      orderId: String(order._id),
      status: order.status,
      cancelReason: order.cancelReason,
      expiresAt: order.expiresAt,
      items: order.items.map((item) => ({
        name: item.name,
        colorway: item.colorway,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotal: order.subtotal ?? order.total,
      shippingFee: order.shippingFee ?? 0,
      total: order.total,
      statusHistory: (order.statusHistory ?? []).map((entry) => ({
        status: entry.status,
        at: entry.at,
        note: entry.note,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/products/:productId/reviews', async (request, response, next) => {
  try {
    const productId = String(request.params.productId || '').trim()
    if (!productId) return response.status(400).json({ error: 'A product id is required.' })

    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, Number.parseInt(request.query.limit, 10) || 25))

    const [reviews, total] = await Promise.all([
      Review.find({ productId, status: 'published' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'name email')
        .lean(),
      Review.countDocuments({ productId, status: 'published' }),
    ])

    response.json({
      reviews: reviews.map((review) => ({
        id: String(review._id),
        rating: review.rating,
        title: review.title,
        body: review.body,
        verifiedPurchase: review.verifiedPurchase,
        createdAt: review.createdAt,
        author: review.userId?.name || review.userId?.email?.split('@')[0] || 'BYOC buyer',
      })),
      page,
      limit,
      total,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/reviews', sessionAuth, async (request, response, next) => {
  try {
    if (!request.user) return response.status(401).json({ error: 'Sign in to leave a review.' })

    const body = request.body ?? {}
    const productId = typeof body.productId === 'string' ? body.productId.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : ''
    const reviewBody = typeof body.body === 'string' ? body.body.trim().slice(0, 2000) : ''
    const rating = Number(body.rating)
    if (!productId) return response.status(400).json({ error: 'Product is required.' })
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return response.status(400).json({ error: 'Rating must be a whole number from 1 to 5.' })
    }

    const existing = await Review.findOne({ productId, userId: request.user._id })
    if (existing) {
      return response.status(409).json({ error: 'You have already reviewed this product.' })
    }

    const verified = await Order.exists({
      'customer.email': request.user.email,
      status: { $in: ['confirmed', 'fulfilled'] },
      'items.productId': productId,
    })

    const review = await Review.create({
      productId,
      userId: request.user._id,
      rating,
      title,
      body: reviewBody,
      verifiedPurchase: Boolean(verified),
    })

    response.status(201).json({
      review: {
        id: String(review._id),
        rating: review.rating,
        title: review.title,
        body: review.body,
        status: review.status,
        verifiedPurchase: review.verifiedPurchase,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.patch('/reviews/:id', sessionAuth, async (request, response, next) => {
  try {
    if (!request.user) return response.status(401).json({ error: 'Sign in to edit a review.' })
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: 'Invalid review id.' })
    }
    const review = await Review.findById(request.params.id)
    if (!review) return response.status(404).json({ error: 'Review not found.' })
    if (String(review.userId) !== String(request.user._id)) {
      return response.status(403).json({ error: 'You can only edit your own review.' })
    }

    const body = request.body ?? {}
    if (body.rating !== undefined) {
      const rating = Number(body.rating)
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return response.status(400).json({ error: 'Rating must be a whole number from 1 to 5.' })
      }
      review.rating = rating
    }
    if (typeof body.title === 'string') review.title = body.title.trim().slice(0, 120)
    if (typeof body.body === 'string') review.body = body.body.trim().slice(0, 2000)

    await review.save()
    response.json({ review })
  } catch (error) {
    next(error)
  }
})

router.delete('/reviews/:id', sessionAuth, async (request, response, next) => {
  try {
    if (!request.user) return response.status(401).json({ error: 'Sign in to delete a review.' })
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: 'Invalid review id.' })
    }
    const review = await Review.findById(request.params.id)
    if (!review) return response.status(404).json({ error: 'Review not found.' })
    if (String(review.userId) !== String(request.user._id)) {
      return response.status(403).json({ error: 'You can only delete your own review.' })
    }
    await review.deleteOne()
    response.status(204).send()
  } catch (error) {
    next(error)
  }
})

router.get('/store-config', async (_request, response, next) => {
  try {
    const shipping = await getShippingConfig()
    response.json({ shipping, cod: true, version: getShippingConfigVersion() })
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

    const unsubscribeToken = Subscriber.generateUnsubscribeToken()
    await Subscriber.updateOne(
      { email },
      {
        $setOnInsert: {
          email,
          unsubscribeToken,
        },
        $set: {
          status: 'subscribed',
          unsubscribedAt: null,
        },
      },
      { upsert: true },
    )
    response.status(200).json({ message: 'Subscription saved.' })
  } catch (error) {
    next(error)
  }
})

router.get('/newsletter/unsubscribe', newsletterUnsubscribeLimiter, async (request, response, next) => {
  try {
    const token = typeof request.query?.token === 'string' ? request.query.token.trim() : ''
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return response.status(400).type('html').send(unsubscribeHtml(false))
    }
    const subscriber = await Subscriber.findOne({ unsubscribeToken: token })
      .select('status')
      .lean()
    if (!subscriber) {
      return response.status(404).type('html').send(unsubscribeHtml(false))
    }
    return response.status(200).type('html').send(unsubscribeHtml(true, token))
  } catch (error) {
    next(error)
  }
})

router.post('/newsletter/unsubscribe', newsletterUnsubscribeLimiter, async (request, response, next) => {
  try {
    const token =
      typeof request.body?.token === 'string'
        ? request.body.token.trim()
        : typeof request.query?.token === 'string'
          ? request.query.token.trim()
          : ''
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return response.status(400).json({ error: 'Unsubscribe token is invalid.' })
    }

    const subscriber = await Subscriber.findOne({ unsubscribeToken: token })
    if (!subscriber) {
      return response.status(404).json({ error: 'Unsubscribe link is invalid.' })
    }

    if (subscriber.status !== 'unsubscribed') {
      subscriber.status = 'unsubscribed'
      subscriber.unsubscribedAt = new Date()
      await subscriber.save()
    }

    response.json({ message: 'You have been unsubscribed.' })
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
      subject: `New BYOC contact message: ${contact.subject}`,
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
