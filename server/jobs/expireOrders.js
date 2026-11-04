import Inventory from '../models/Inventory.js'
import Order from '../models/Order.js'
import { config } from '../config.js'
import { sendNotifications } from '../services/notifications.js'

const intervalMilliseconds = 5 * 60 * 1000

async function restoreStock(order) {
  const operations = order.items.map((item) => ({
    updateOne: {
      filter: { productId: item.productId, size: item.size },
      update: { $inc: { quantity: item.quantity } },
    },
  }))
  if (operations.length > 0) await Inventory.bulkWrite(operations)
}

async function expireOne(orderId) {
  const now = new Date()
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'pending', expiresAt: { $lte: now } },
    {
      $set: { status: 'cancelled', cancelReason: 'expired' },
      $push: {
        statusHistory: {
          status: 'cancelled',
          at: now,
          note: 'Cancelled automatically after the 72-hour hold expired',
        },
      },
    },
    { returnDocument: 'after' },
  )
  if (!order) return false

  await restoreStock(order)
  await Order.updateOne(
    { _id: order._id },
    { $set: { stockReleasedAt: now } },
    { runValidators: true },
  )

  await sendNotifications({
    subject: `BYOC order ${order._id}: cancelled`,
    text: `Your BYOC order ${order._id} was automatically cancelled because it was not confirmed within ${config.pendingOrderTtlHours} hours. Your items have been released.`,
    customerEmail: order.customer.email,
    customerPhone: order.customer.phone,
  }).catch((error) => {
    console.error(`Expiry notification failed: ${error.message}`)
  })

  return true
}

async function recoverUnreleasedStock() {
  const stuck = await Order.find({
    status: 'cancelled',
    cancelReason: 'expired',
    stockReleasedAt: null,
  })
    .select('_id items')
    .lean()

  let recovered = 0
  for (const candidate of stuck) {
    const winner = await Order.findOneAndUpdate(
      { _id: candidate._id, status: 'cancelled', cancelReason: 'expired', stockReleasedAt: null },
      { $set: { stockReleasedAt: new Date() } },
      { returnDocument: 'after' },
    )
    if (!winner) continue
    await restoreStock(winner)
    recovered += 1
  }
  return recovered
}

export async function expirePendingOrders() {
  const now = new Date()
  const candidates = await Order.find({
    status: 'pending',
    expiresAt: { $lte: now },
  })
    .select('_id')
    .lean()

  let cancelled = 0
  for (const candidate of candidates) {
    try {
      if (await expireOne(candidate._id)) cancelled += 1
    } catch (error) {
      console.error(`Order expiry failed for ${candidate._id}: ${error.message}`)
    }
  }
  const recovered = await recoverUnreleasedStock().catch((error) => {
    console.error(`Stock recovery failed: ${error.message}`)
    return 0
  })
  if (cancelled || recovered) {
    console.log(`Expired ${cancelled} pending order(s); recovered stock for ${recovered}.`)
  }
  return cancelled
}

let timer = null

export function startOrderExpirationJob() {
  expirePendingOrders().catch((error) =>
    console.error(`Initial order expiry run failed: ${error.message}`),
  )
  timer = setInterval(() => {
    expirePendingOrders().catch((error) =>
      console.error(`Order expiry run failed: ${error.message}`),
    )
  }, intervalMilliseconds)
  if (typeof timer.unref === 'function') timer.unref()
  return () => {
    if (timer) clearInterval(timer)
    timer = null
  }
}
