import express from 'express'
import crypto from 'node:crypto'
import User from '../models/User.js'
import Order from '../models/Order.js'
import sessionAuth from '../middleware/sessionAuth.js'
import { recordAudit } from '../services/audit.js'

const router = express.Router()

function requireAuth(request, response, next) {
  if (!request.user) return response.status(401).json({ error: 'Authentication required.' })
  next()
}

function requireCsrf(request, response, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next()
  const cookieToken = request.cookies?.csrf_token ?? ''
  const headerToken = request.get('x-csrf-token') ?? ''
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return response.status(403).json({ error: 'CSRF validation failed.' })
  }
  next()
}

router.use(sessionAuth)
router.use(requireAuth)
router.use(requireCsrf)

router.get('/profile', async (request, response, next) => {
  try {
    response.json({ user: request.user })
  } catch (error) {
    next(error)
  }
})

router.patch('/profile', async (request, response, next) => {
  try {
    const body = request.body ?? {}
    if (typeof body.name === 'string') request.user.name = body.name.trim()
    await request.user.save()
    response.json({ user: request.user })
  } catch (error) {
    next(error)
  }
})

router.get('/wishlist', async (request, response, next) => {
  try {
    response.json({ wishlist: request.user.wishlist ?? [] })
  } catch (error) {
    next(error)
  }
})

router.put('/wishlist', async (request, response, next) => {
  try {
    const body = request.body ?? {}
    const wishlist = Array.isArray(body.wishlist)
      ? [...new Set(body.wishlist.filter((value) => typeof value === 'string'))]
      : request.user.wishlist
    request.user.wishlist = wishlist
    await request.user.save()
    response.json({ wishlist: request.user.wishlist })
  } catch (error) {
    next(error)
  }
})

router.get('/addresses', async (request, response, next) => {
  try {
    response.json({ addresses: request.user.addresses ?? [] })
  } catch (error) {
    next(error)
  }
})

router.post('/addresses', async (request, response, next) => {
  try {
    const body = request.body ?? {}
    request.user.addresses.push({
      label: typeof body.label === 'string' ? body.label.trim() : 'Home',
      name: body.name,
      phone: body.phone,
      address: body.address,
      city: body.city,
      isDefault: Boolean(body.isDefault),
    })
    await request.user.save()
    response.status(201).json({ addresses: request.user.addresses })
  } catch (error) {
    next(error)
  }
})

router.patch('/addresses/:id', async (request, response, next) => {
  try {
    const address = request.user.addresses.id(request.params.id)
    if (!address) return response.status(404).json({ error: 'Address not found.' })
    const body = request.body ?? {}
    if (typeof body.label === 'string') address.label = body.label.trim()
    if (typeof body.name === 'string') address.name = body.name.trim()
    if (typeof body.phone === 'string') address.phone = body.phone.trim()
    if (typeof body.address === 'string') address.address = body.address.trim()
    if (typeof body.city === 'string') address.city = body.city.trim()
    if (typeof body.isDefault === 'boolean') address.isDefault = body.isDefault
    await request.user.save()
    response.json({ addresses: request.user.addresses })
  } catch (error) {
    next(error)
  }
})

router.delete('/addresses/:id', async (request, response, next) => {
  try {
    const address = request.user.addresses.id(request.params.id)
    if (!address) return response.status(404).json({ error: 'Address not found.' })
    address.deleteOne()
    await request.user.save()
    response.status(204).send()
  } catch (error) {
    next(error)
  }
})

router.get('/orders', async (request, response, next) => {
  try {
    const orders = await Order.find({ 'customer.email': request.user.email })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
    response.json({
      orders: orders.map((order) => ({
        orderId: String(order._id),
        status: order.status,
        statusHistory: order.statusHistory ?? [],
        subtotal: order.subtotal ?? order.total,
        shippingFee: order.shippingFee ?? 0,
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        expiresAt: order.expiresAt,
        cancelReason: order.cancelReason,
        items: order.items,
      })),
    })
  } catch (error) {
    next(error)
  }
})

export default router
