import { Router } from 'express'
import mongoose from 'mongoose'
import ContactMessage from '../models/ContactMessage.js'
import Collection from '../models/Collection.js'
import Inventory from '../models/Inventory.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Subscriber from '../models/Subscriber.js'
import requireAdmin from '../middleware/requireAdmin.js'
import { sendNotifications } from '../services/notifications.js'
import Review from '../models/Review.js'
import { recordAudit } from '../services/audit.js'

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
      {
        $set: { status },
        $push: {
          statusHistory: {
            status,
            at: new Date(),
            note: `Moved from ${previousStatus} to ${status} by staff`,
          },
        },
      },
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
      subject: `BYOC order ${changedOrder._id}: ${status}`,
      text: `Your BYOC order ${changedOrder._id} is now ${status}.`,
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

router.get('/settings/shipping', async (_request, response) => {
  try {
    response.json({ shipping: await getShippingConfig() })
  } catch (error) {
    next(error)
  }
})

router.put('/settings/shipping', async (request, response) => {
  try {
    const payload = request.body?.shipping ?? request.body ?? {}
    const updated = await updateShippingConfig(payload)
    bumpShippingConfigVersion()
    response.json({ shipping: updated.shipping })
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
})

router.get('/collections', async (_request, response, next) => {
  try {
    const collections = await Collection.find().sort({ sortOrder: 1, name: 1 }).lean()
    const counts = await Promise.all(
      collections.map((collection) =>
        Product.countDocuments({ collectionId: collection._id }).then((count) => ({
          id: collection._id.toString(),
          slug: collection.slug,
          name: collection.name,
          description: collection.description,
          image: collection.image,
          active: collection.active,
          sortOrder: collection.sortOrder,
          productCount: count,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
        })),
      ),
    )
    response.json({ collections: counts })
  } catch (error) {
    next(error)
  }
})

router.post('/collections', async (request, response, next) => {
  try {
    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : ''
    if (!name) return response.status(400).json({ error: 'Collection name is required.' })

    const slugInput = typeof request.body?.slug === 'string' ? request.body.slug.trim() : ''
    const slug = Collection.slugify(slugInput || name)
    if (!slug) return response.status(400).json({ error: 'Collection slug is required.' })

    const collection = await Collection.create({
      name,
      slug,
      description:
        typeof request.body?.description === 'string' ? request.body.description.trim() : '',
      image: typeof request.body?.image === 'string' ? request.body.image.trim() || null : null,
      active: typeof request.body?.active === 'boolean' ? request.body.active : true,
      sortOrder: Number.isInteger(request.body?.sortOrder) ? request.body.sortOrder : 0,
    })
    response.status(201).json({ collection })
  } catch (error) {
    if (error?.code === 11000) {
      return response.status(409).json({ error: 'Collection slug already exists.' })
    }
    next(error)
  }
})

router.patch('/collections/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: 'Invalid collection id.' })
    }
    const collection = await Collection.findById(request.params.id)
    if (!collection) return response.status(404).json({ error: 'Collection not found.' })

    if (typeof request.body?.name === 'string' && request.body.name.trim()) {
      collection.name = request.body.name.trim()
    }
    if (typeof request.body?.slug === 'string' && request.body.slug.trim()) {
      collection.slug = Collection.slugify(request.body.slug)
    }
    if (typeof request.body?.description === 'string') {
      collection.description = request.body.description.trim()
    }
    if (typeof request.body?.image === 'string') {
      collection.image = request.body.image.trim() || null
    }
    if (typeof request.body?.active === 'boolean') {
      collection.active = request.body.active
    }
    if (Number.isInteger(request.body?.sortOrder)) {
      collection.sortOrder = request.body.sortOrder
    }

    await collection.save()
    response.json({ collection })
  } catch (error) {
    if (error?.code === 11000) {
      return response.status(409).json({ error: 'Collection slug already exists.' })
    }
    next(error)
  }
})

router.delete('/collections/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: 'Invalid collection id.' })
    }
    const collection = await Collection.findById(request.params.id)
    if (!collection) return response.status(404).json({ error: 'Collection not found.' })

    const productCount = await Product.countDocuments({ collectionId: collection._id })
    if (productCount > 0) {
      return response.status(409).json({
        error: 'Cannot delete a collection that still has products. Reassign or deactivate it instead.',
        productCount,
      })
    }

    await collection.deleteOne()
    response.status(204).send()
  } catch (error) {
    next(error)
  }
})

router.get('/subscribers/export', async (_request, response, next) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 }).lean()
    const rows = [
      ['email', 'status', 'subscribedAt', 'unsubscribedAt'],
      ...subscribers.map((subscriber) => [
        subscriber.email,
        subscriber.status,
        subscriber.createdAt?.toISOString() ?? '',
        subscriber.unsubscribedAt?.toISOString() ?? '',
      ]),
    ]
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')

    response
      .status(200)
      .type('text/csv; charset=utf-8')
      .set('Content-Disposition', 'attachment; filename="newsletter-subscribers.csv"')
      .send(`\uFEFF${csv}`)
  } catch (error) {
    next(error)
  }
})

router.get('/subscribers', async (request, response, next) => {
  try {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 25))
    const filter = ['subscribed', 'unsubscribed'].includes(request.query.status)
      ? { status: request.query.status }
      : {}
    const [subscribers, total] = await Promise.all([
      Subscriber.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('email status createdAt unsubscribedAt')
        .lean(),
      Subscriber.countDocuments(filter),
    ])
    response.json({ subscribers, page, limit, total })
  } catch (error) {
    next(error)
  }
})
router.patch('/contacts/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: 'Invalid contact id.' })
    }
    const contact = await ContactMessage.findById(request.params.id)
    if (!contact) return response.status(404).json({ error: 'Contact message not found.' })

    const status = request.body?.status
    if (status !== undefined && !['new', 'open', 'resolved'].includes(status)) {
      return response.status(400).json({ error: 'Status must be new, open, or resolved.' })
    }

    const previousStatus = contact.status
    if (status) {
      contact.status = status
      if (status === 'resolved') contact.handledAt = new Date()
      else contact.handledAt = undefined
      await contact.save()
    }

    if (previousStatus !== contact.status) {
      recordAudit(request, {
        action: 'contact.status',
        targetType: 'contact',
        targetId: contact._id,
        metadata: { from: previousStatus, to: contact.status },
      })
    }

    response.json({ contact })
  } catch (error) {
    next(error)
  }
})

router.delete('/contacts/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: 'Invalid contact id.' })
    }
    const contact = await ContactMessage.findByIdAndDelete(request.params.id)
    if (!contact) return response.status(404).json({ error: 'Contact message not found.' })

    recordAudit(request, {
      action: 'contact.delete',
      targetType: 'contact',
      targetId: contact._id,
      metadata: { email: contact.email },
    })

    response.status(204).send()
  } catch (error) {
    next(error)
  }
})

function normalizeProductId(name, requestedId) {
  const raw = String(requestedId || name || '').trim()
  let slug = Collection.slugify(raw)
  if (!slug) slug = `product-${Date.now().toString(36)}`
  return slug
}

async function uniqueProductId(base) {
  let candidate = base
  let suffix = 1
  while (await Product.exists({ productId: candidate })) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  return candidate
}

router.get('/products', async (request, response, next) => {
  try {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 50))
    const search = typeof request.query.search === 'string' ? request.query.search.trim() : ''
    const filter = {}
    if (request.query.active === 'true') filter.active = true
    if (request.query.active === 'false') filter.active = false
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [
        { name: regex },
        { productId: regex },
        { colorway: regex },
        { badge: regex },
      ]
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('collectionId')
        .sort({ name: 1, colorway: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ])

    response.json({
      products: products.map((product) => ({
        id: product._id.toString(),
        productId: product.productId,
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
        shippingOverride: product.shippingOverride,
        active: product.active,
        collection: product.collectionId
          ? {
              id: product.collectionId._id.toString(),
              slug: product.collectionId.slug,
              name: product.collectionId.name,
            }
          : null,
      })),
      page,
      limit,
      total,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/products', async (request, response, next) => {
  try {
    const body = request.body ?? {}
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const category = typeof body.category === 'string' ? body.category.trim() : ''
    const collectionId = typeof body.collectionId === 'string' ? body.collectionId.trim() : ''
    if (!name) return response.status(400).json({ error: 'Product name is required.' })
    if (!mongoose.isValidObjectId(collectionId)) {
      return response.status(400).json({ error: 'A valid collection is required.' })
    }
    const collection = await Collection.findById(collectionId)
    if (!collection) return response.status(404).json({ error: 'Collection not found.' })
    const price = Number(body.price)
    if (!Number.isFinite(price) || price < 0) {
      return response.status(400).json({ error: 'Price must be a number of at least 0.' })
    }
    const sizes = Array.isArray(body.sizes)
      ? [...new Set(body.sizes.filter((value) => typeof value === 'string').map((value) => value.trim()).filter(Boolean))]
      : []
    const shippingOverride =
      body.shippingOverride === '' || body.shippingOverride == null
        ? null
        : Number(body.shippingOverride)
    if (shippingOverride !== null && (!Number.isFinite(shippingOverride) || shippingOverride < 0)) {
      return response.status(400).json({ error: 'Shipping override must be a non-negative number.' })
    }

    const productId = await uniqueProductId(normalizeProductId(name, body.productId))
    const product = await Product.create({
      productId,
      name,
      price,
      category: category || collection.slug,
      badge: typeof body.badge === 'string' ? body.badge.trim() || null : null,
      garment:
        body.garment && typeof body.garment === 'object' ? body.garment : { type: 'tee', body: '#111111', trim: '#333333', print: 'logo' },
      colors: Array.isArray(body.colors) ? body.colors.filter((value) => typeof value === 'string') : [],
      activeColor: Number.isInteger(body.activeColor) ? body.activeColor : 0,
      sizes,
      color: typeof body.color === 'string' ? body.color.trim() || '#000000' : '#000000',
      colorway:
        typeof body.colorway === 'string' ? body.colorway.trim() || 'Default' : 'Default',
      added: Number.isInteger(body.added) ? body.added : 0,
      shippingOverride,
      active: typeof body.active === 'boolean' ? body.active : true,
      collectionId: collection._id,
    })

    if (sizes.length) {
      await Inventory.bulkWrite(
        sizes.map((size) => ({
          updateOne: {
            filter: { productId, size },
            update: { $setOnInsert: { productId, size, quantity: 0 } },
            upsert: true,
          },
        })),
      )
    }

    recordAudit(request, {
      action: 'product.create',
      targetType: 'product',
      targetId: product._id,
      metadata: { productId, name },
    })

    response.status(201).json({ product })
  } catch (error) {
    next(error)
  }
})

router.patch('/products/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: 'Invalid product id.' })
    }
    const product = await Product.findById(request.params.id)
    if (!product) return response.status(404).json({ error: 'Product not found.' })

    const body = request.body ?? {}
    if (typeof body.name === 'string' && body.name.trim()) product.name = body.name.trim()
    if (body.price !== undefined) {
      const price = Number(body.price)
      if (!Number.isFinite(price) || price < 0) {
        return response.status(400).json({ error: 'Price must be a number of at least 0.' })
      }
      product.price = price
    }
    if (typeof body.category === 'string' && body.category.trim()) product.category = body.category.trim()
    if (typeof body.badge === 'string') product.badge = body.badge.trim() || null
    if (typeof body.colorway === 'string' && body.colorway.trim()) product.colorway = body.colorway.trim()
    if (typeof body.color === 'string' && body.color.trim()) product.color = body.color.trim()
    if (Array.isArray(body.sizes)) {
      const nextSizes = [
        ...new Set(body.sizes.filter((value) => typeof value === 'string').map((value) => value.trim()).filter(Boolean)),
      ]
      const previousSizes = product.sizes || []
      const removed = previousSizes.filter((size) => !nextSizes.includes(size))
      const added = nextSizes.filter((size) => !previousSizes.includes(size))
      product.sizes = nextSizes
      if (added.length) {
        await Inventory.bulkWrite(
          added.map((size) => ({
            updateOne: {
              filter: { productId: product.productId, size },
              update: { $setOnInsert: { productId: product.productId, size, quantity: 0 } },
              upsert: true,
            },
          })),
        )
      }
      if (removed.length) {
        await Inventory.deleteMany({ productId: product.productId, size: { $in: removed } })
      }
    }
    if (Array.isArray(body.colors)) product.colors = body.colors.filter((value) => typeof value === 'string')
    if (Number.isInteger(body.activeColor)) product.activeColor = body.activeColor
    if (Number.isInteger(body.added)) product.added = body.added
    if (typeof body.garment === 'object' && body.garment !== null) product.garment = body.garment
    if (typeof body.active === 'boolean') product.active = body.active
    if (body.shippingOverride === '' || body.shippingOverride == null) product.shippingOverride = null
    else {
      const override = Number(body.shippingOverride)
      if (!Number.isFinite(override) || override < 0) {
        return response.status(400).json({ error: 'Shipping override must be a non-negative number.' })
      }
      product.shippingOverride = override
    }
    if (typeof body.collectionId === 'string' && body.collectionId.trim()) {
      if (!mongoose.isValidObjectId(body.collectionId)) {
        return response.status(400).json({ error: 'Invalid collection id.' })
      }
      const collection = await Collection.findById(body.collectionId)
      if (!collection) return response.status(404).json({ error: 'Collection not found.' })
      product.collectionId = collection._id
      if (!product.category) product.category = collection.slug
    }

    await product.save()

    recordAudit(request, {
      action: 'product.update',
      targetType: 'product',
      targetId: product._id,
      metadata: Object.keys(body),
    })

    response.json({ product })
  } catch (error) {
    next(error)
  }
})

router.delete('/products/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: 'Invalid product id.' })
    }
    const product = await Product.findById(request.params.id)
    if (!product) return response.status(404).json({ error: 'Product not found.' })
    product.active = false
    await product.save()

    recordAudit(request, {
      action: 'product.deactivate',
      targetType: 'product',
      targetId: product._id,
      metadata: { productId: product.productId },
    })

    response.json({ product })
  } catch (error) {
    next(error)
  }
})

router.get('/orders/export', async (request, response, next) => {
  try {
    const filter = {}
    if (statuses.has(request.query.status)) filter.status = request.query.status
    if (request.query.from || request.query.to) {
      filter.createdAt = {}
      if (request.query.from) filter.createdAt.$gte = new Date(request.query.from)
      if (request.query.to) filter.createdAt.$lte = new Date(request.query.to)
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean()
    const rows = [
      ['orderId', 'status', 'customer', 'email', 'phone', 'city', 'items', 'subtotal', 'shippingFee', 'total', 'createdAt'],
      ...orders.map((order) => [
        String(order._id),
        order.status,
        order.customer?.name ?? '',
        order.customer?.email ?? '',
        order.customer?.phone ?? '',
        order.customer?.city ?? '',
        order.items.map((item) => `${item.name} (${item.size}) x${item.quantity}`).join(' | '),
        order.subtotal ?? order.total ?? 0,
        order.shippingFee ?? 0,
        order.total ?? 0,
        order.createdAt?.toISOString() ?? '',
      ]),
    ]
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')

    response
      .status(200)
      .type('text/csv; charset=utf-8')
      .set('Content-Disposition', 'attachment; filename="orders.csv"')
      .send(`\uFEFF${csv}`)
  } catch (error) {
    next(error)
  }
})

router.get('/stats', async (_request, response, next) => {
  try {
    const [pendingOrders, newContacts, lowStock, revenueAgg] = await Promise.all([
      Order.countDocuments({ status: 'pending' }),
      ContactMessage.countDocuments({ status: 'new' }),
      Inventory.countDocuments({ quantity: { $lte: config.lowStockThreshold } }),
      Order.aggregate([
        { $match: { status: { $in: ['confirmed', 'fulfilled'] } } },
        { $group: { _id: null, revenue: { $sum: '$total' } } },
      ]),
    ])

    response.json({
      pendingOrders,
      newContacts,
      lowStockVariants: lowStock,
      revenue: revenueAgg[0]?.revenue ?? 0,
      lowStockThreshold: config.lowStockThreshold,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/audit', async (request, response, next) => {
  try {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 50))
    const [entries, total] = await Promise.all([
      AuditLog.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(),
    ])
    response.json({ entries, page, limit, total })
  } catch (error) {
    next(error)
  }
})

router.get('/reviews', async (request, response, next) => {
  try {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 50))
    const filter = {}
    if (['pending', 'published', 'rejected'].includes(request.query.status)) {
      filter.status = request.query.status
    }
    if (typeof request.query.productId === 'string' && request.query.productId.trim()) {
      filter.productId = request.query.productId.trim()
    }
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ])
    response.json({ reviews, page, limit, total })
  } catch (error) {
    next(error)
  }
})

router.patch('/reviews/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: 'Invalid review id.' })
    }
    const review = await Review.findById(request.params.id)
    if (!review) return response.status(404).json({ error: 'Review not found.' })

    const status = request.body?.status
    const previousStatus = review.status
    if (status && !['pending', 'published', 'rejected'].includes(status)) {
      return response.status(400).json({ error: 'Invalid review status.' })
    }
    if (status) review.status = status
    await review.save()

    recordAudit(request, {
      action: 'review.moderate',
      targetType: 'review',
      targetId: review._id,
      metadata: { from: previousStatus, to: review.status },
    })

    response.json({ review })
  } catch (error) {
    next(error)
  }
})

router.delete('/reviews/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: 'Invalid review id.' })
    }
    const review = await Review.findByIdAndDelete(request.params.id)
    if (!review) return response.status(404).json({ error: 'Review not found.' })

    recordAudit(request, {
      action: 'review.delete',
      targetType: 'review',
      targetId: review._id,
      metadata: { productId: review.productId },
    })
    response.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router
