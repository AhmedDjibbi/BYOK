/* ==========================================================================
   BYOC — demo data seeder (testing only)

   Adds realistic mock data on top of `npm run seed`:
   stock levels, accounts, orders, reviews, subscribers, contacts and audit
   entries. Safe to re-run: everything is keyed by a stable demo identity.

   Usage:
     npm run seed:demo              # seed catalogue + demo data

   Optional flags (PowerShell shown; bash uses VAR=1 npm run seed:demo):
     $env:SEED_DEMO_RESET=1; npm run seed:demo   # wipe and recreate demo data
     $env:SEED_DEMO_FORCE=1; npm run seed:demo   # allow running with NODE_ENV=production
   ========================================================================== */

import crypto from 'node:crypto'
import { promisify } from 'node:util'
import mongoose from 'mongoose'
import { storeCatalogue } from '../src/data/store.js'
import { config } from './config.js'
import AuditLog from './models/AuditLog.js'
import ContactMessage from './models/ContactMessage.js'
import Inventory from './models/Inventory.js'
import Order from './models/Order.js'
import Review from './models/Review.js'
import StoreSetting from './models/StoreSetting.js'
import Subscriber from './models/Subscriber.js'
import User from './models/User.js'
import { calculateShipping } from './services/shipping.js'

const scrypt = promisify(crypto.scrypt)
const DEMO_PASSWORD = 'Demo1234!'

const demoUsers = [
  {
    email: 'demo@byoc.test',
    name: 'Demo Shopper',
    city: 'Tunis',
    address: '12 Rue de la Liberté',
    phone: '+216 20 111 222',
    wishlist: [storeCatalogue[4].id, storeCatalogue[13].id],
  },
  {
    email: 'amina.benali@byoc.test',
    name: 'Amina Benali',
    city: 'Sousse',
    address: '8 Avenue Habib Bourguiba',
    phone: '+216 22 333 444',
    wishlist: [storeCatalogue[0].id],
  },
  {
    email: 'sara.trabelsi@byoc.test',
    name: 'Sara Trabelsi',
    city: 'Sfax',
    address: '31 Rue Mongi Slim',
    phone: '+216 25 555 666',
    wishlist: [],
  },
  {
    email: 'yassine.gharbi@byoc.test',
    name: 'Yassine Gharbi',
    city: 'Ariana',
    address: '5 Rue Ibn Khaldoun',
    phone: '+216 98 777 888',
    wishlist: [storeCatalogue[9].id, storeCatalogue[20].id],
  },
]

// [userIndex, status, daysAgo, [[catalogueIndex, quantity], ...]]
const orderSeeds = [
  [0, 'pending', 1, [[0, 1], [16, 1]]],
  [1, 'pending', 2, [[4, 2]]],
  [2, 'pending', 0, [[8, 1], [24, 1], [32, 1]]],
  [0, 'confirmed', 5, [[12, 1]]],
  [1, 'confirmed', 8, [[20, 1], [28, 2]]],
  [3, 'confirmed', 12, [[36, 1]]],
  [0, 'fulfilled', 21, [[4, 1], [5, 1]]],
  [1, 'fulfilled', 27, [[13, 1]]],
  [2, 'fulfilled', 34, [[21, 2], [40, 1]]],
  [3, 'fulfilled', 45, [[1, 1], [9, 1]]],
  [2, 'cancelled', 17, [[2, 1]]],
  [3, 'cancelled', 38, [[30, 1], [44, 1]]],
]

// [userIndex, catalogueIndex, rating, title, body, status]
const reviewSeeds = [
  [0, 0, 5, 'Heavyweight and sharp', 'The print is crisp and the cotton feels substantial. Fits true to size.', 'published'],
  [0, 4, 4, 'Great everyday hoodie', 'Warm without being bulky. Lost half a star because the sleeves run long.', 'published'],
  [1, 4, 5, 'Best hoodie I own', 'Ordered a second one in another colourway after a week.', 'published'],
  [1, 13, 4, 'Solid jacket', 'The puffer is light but genuinely warm. Zips feel sturdy.', 'published'],
  [2, 8, 3, 'Nice but boxy', 'Fabric is good, though the cut is wider than the photos suggest.', 'published'],
  [2, 21, 5, 'Exactly as pictured', 'Colour matches the site and the fit is spot on.', 'published'],
  [3, 9, 5, 'Cargo pockets done right', 'Enough storage without looking tactical. Would buy again.', 'published'],
  [3, 1, 4, 'Good tee, slow delivery', 'Shirt is great, shipping took a few days longer than expected.', 'published'],
  [1, 20, 5, 'My new daily jacket', 'Wearing it constantly. The lining is a nice surprise.', 'published'],
  [0, 16, 4, 'Clean graphic', 'Simple but well executed. Washed twice with no cracking.', 'published'],
  [2, 24, 5, 'Cap fits perfectly', 'Adjustable strap actually holds. Brim keeps its shape.', 'published'],
  [3, 40, 4, 'Handy crossbody', 'Perfect size for a phone and wallet. Strap is comfortable.', 'published'],
  [0, 28, 4, 'Warm and light', 'Compresses small in a bag. Great for evenings.', 'pending'],
  [1, 32, 3, 'Runs small', 'Size up if you are between sizes. Otherwise a nice piece.', 'pending'],
]

// [email, status, daysAgo]
const subscriberSeeds = [
  ['demo@byoc.test', 'subscribed', 40],
  ['amina.benali@byoc.test', 'subscribed', 25],
  ['sara.trabelsi@byoc.test', 'subscribed', 12],
  ['yassine.gharbi@byoc.test', 'subscribed', 6],
  ['newsletter.fan@example.com', 'unsubscribed', 30],
  ['dropwatch@example.com', 'subscribed', 2],
]

// [name, email, subject, message, status, daysAgo]
const contactSeeds = [
  ['Nour Ayari', 'nour.ayari@example.com', 'Sizing on the puffer', 'I am 1m78 and usually wear M. Should I size up for layering?', 'new', 1],
  ['Karim Jaziri', 'karim.jaziri@example.com', 'Exchange request', 'The hoodie arrived in the wrong colourway. How do I exchange it?', 'open', 3],
  ['Leila Mansour', 'leila.mansour@example.com', 'Wholesale enquiry', 'Do you offer bulk pricing for a concept store in La Marsa?', 'resolved', 9],
  ['Mehdi Chaabane', 'mehdi.chaabane@example.com', 'Order tracking', 'The tracking page is not showing updates for my order.', 'open', 5],
]

const auditSeeds = [
  ['inventory.update', 'inventory', 'Restocked 12 units', 2],
  ['product.update', 'product', 'Changed price to 129 TND', 4],
  ['order.status', 'order', 'Confirmed pending order', 5],
  ['settings.update', 'store-setting', 'Shipping set to 7 TND flat', 8],
  ['product.create', 'product', 'Added new colourway', 13],
  ['contact.resolve', 'contact', 'Marked wholesale enquiry resolved', 19],
]

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const demoId = (key) =>
  new mongoose.Types.ObjectId(
    crypto.createHash('sha256').update(`byoc-demo:${key}`).digest('hex').slice(0, 24),
  )

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64)
  return `scrypt:${salt}:${derived.toString('hex')}`
}

function demoStock(productIndex, sizeIndex) {
  // Deterministic spread: some variants sold out, some low, most healthy.
  return (productIndex * 7 + sizeIndex * 5) % 26
}

async function resetDemoData() {
  const emails = demoUsers.map((user) => user.email)
  const users = await User.find({ email: { $in: emails } }).select('_id').lean()
  await Review.deleteMany({ userId: { $in: users.map((user) => user._id) } })
  await Order.deleteMany({ 'customer.email': { $in: emails } })
  await ContactMessage.deleteMany({ _id: { $in: contactSeeds.map((_, index) => demoId(`contact-${index}`)) } })
  await AuditLog.deleteMany({ _id: { $in: auditSeeds.map((_, index) => demoId(`audit-${index}`)) } })
  await Subscriber.deleteMany({ email: { $in: subscriberSeeds.map(([email]) => email) } })
  await User.deleteMany({ email: { $in: emails } })
  console.log('Removed previous demo data.')
}

async function ensureStock() {
  const operations = storeCatalogue.flatMap((product, productIndex) =>
    product.sizes.map((size, sizeIndex) => ({
      updateOne: {
        filter: { productId: product.id, size },
        update: [
          {
            $set: {
              productId: product.id,
              size,
              quantity: {
                $cond: [
                  { $eq: [{ $ifNull: ['$quantity', 0] }, 0] },
                  demoStock(productIndex, sizeIndex),
                  '$quantity',
                ],
              },
              createdAt: { $ifNull: ['$createdAt', '$$NOW'] },
              updatedAt: '$$NOW',
            },
          },
        ],
        upsert: true,
      },
    })),
  )

  await Inventory.collection.bulkWrite(operations, { ordered: false })
  const [variants, inStock, lowStock, outOfStock] = await Promise.all([
    Inventory.countDocuments(),
    Inventory.countDocuments({ quantity: { $gt: config.lowStockThreshold } }),
    Inventory.countDocuments({ quantity: { $gt: 0, $lte: config.lowStockThreshold } }),
    Inventory.countDocuments({ quantity: 0 }),
  ])
  return { variants, inStock, lowStock, outOfStock }
}

async function ensureUsers() {
  const passwordHash = await hashPassword(DEMO_PASSWORD)
  const users = []

  for (const demo of demoUsers) {
    const user = await User.findOneAndUpdate(
      { email: demo.email },
      {
        $setOnInsert: {
          email: demo.email,
          name: demo.name,
          passwordHash,
          emailVerifiedAt: daysAgo(60),
          status: 'active',
          addresses: [
            {
              label: 'Home',
              name: demo.name,
              phone: demo.phone,
              address: demo.address,
              city: demo.city,
              isDefault: true,
            },
          ],
          wishlist: demo.wishlist,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
    users.push(user)
  }

  return users
}

async function ensureShippingConfig() {
  const settings = await StoreSetting.findOneAndUpdate(
    { key: 'store' },
    {
      $setOnInsert: {
        key: 'store',
        shipping: { mode: 'fixed', value: 7, currency: 'TND' },
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  )
  return settings.shipping
}

function buildOrder(seed, shippingConfig) {
  const [userIndex, status, age, lines] = seed
  const demo = demoUsers[userIndex]
  const created = daysAgo(age)

  const items = lines.map(([catalogueIndex, quantity]) => {
    const product = storeCatalogue[catalogueIndex % storeCatalogue.length]
    return {
      productId: product.id,
      name: product.name,
      colorway: product.colorway,
      size: product.sizes[(catalogueIndex + quantity) % product.sizes.length],
      unitPrice: product.price,
      quantity,
      shippingOverride: product.shippingOverride ?? null,
    }
  })

  const totals = calculateShipping(items, shippingConfig)
  const history = [{ status: 'pending', at: created, note: 'Order placed' }]
  let updated = created

  if (status === 'confirmed' || status === 'fulfilled') {
    updated = daysAgo(age - 1)
    history.push({ status: 'confirmed', at: updated, note: 'Payment confirmed' })
  }
  if (status === 'fulfilled') {
    updated = daysAgo(Math.max(age - 3, 0))
    history.push({ status: 'fulfilled', at: updated, note: 'Handed to courier' })
  }
  if (status === 'cancelled') {
    updated = daysAgo(Math.max(age - 2, 0))
    history.push({ status: 'cancelled', at: updated, note: 'Customer requested cancellation' })
  }

  return {
    _id: demoId(`order-${demo.email}-${age}-${lines[0][0]}`),
    createdAt: created,
    updatedAt: updated,
    customer: {
      name: demo.name,
      email: demo.email,
      phone: demo.phone,
      address: demo.address,
      city: demo.city,
    },
    items: items.map(({ shippingOverride: _ignored, ...item }) => item),
    subtotal: totals.subtotal,
    shippingFee: totals.shippingFee,
    total: totals.total,
    shippingSnapshot: totals.shippingSnapshot,
    status,
    ...(status === 'pending'
      ? { expiresAt: new Date(created.getTime() + config.pendingOrderTtlHours * 60 * 60 * 1000) }
      : { expiresAt: created }),
    ...(status === 'cancelled'
      ? { cancelReason: 'Customer requested cancellation', stockReleasedAt: updated }
      : {}),
    statusHistory: history,
  }
}

async function ensureOrders(shippingConfig) {
  const inserted = []

  for (const seed of orderSeeds) {
    const order = buildOrder(seed, shippingConfig)
    if (await Order.exists({ _id: order._id })) continue

    await Order.create(order)
    inserted.push(order)
  }

  if (inserted.length > 0) {
    // Keep the seeded timeline instead of "today" for every order.
    await Order.collection.bulkWrite(
      inserted.map((order) => ({
        updateOne: {
          filter: { _id: order._id },
          update: { $set: { createdAt: order.createdAt, updatedAt: order.updatedAt } },
        },
      })),
    )
  }

  // Every demo order already exists after the first run; use them all for reviews.
  return Order.find({ 'customer.email': { $in: demoUsers.map((user) => user.email) } })
    .select('customer.email items status _id')
    .lean()
}

async function ensureReviews(users, orders) {
  const purchased = new Set()
  for (const order of orders) {
    if (!['confirmed', 'fulfilled'].includes(order.status)) continue
    for (const item of order.items) {
      purchased.add(`${order.customer.email}::${item.productId}`)
    }
  }

  const userIdByEmail = new Map(users.map((user) => [user.email, user._id]))
  let created = 0

  for (const [userIndex, catalogueIndex, rating, title, body, status] of reviewSeeds) {
    const demo = demoUsers[userIndex]
    const product = storeCatalogue[catalogueIndex % storeCatalogue.length]
    const userId = userIdByEmail.get(demo.email)
    if (!userId) continue

    const result = await Review.updateOne(
      { productId: product.id, userId },
      {
        $setOnInsert: {
          productId: product.id,
          userId,
          rating,
          title,
          body,
          status,
          verifiedPurchase: purchased.has(`${demo.email}::${product.id}`),
        },
      },
      { upsert: true },
    )
    if (result.upsertedCount) created += 1
  }

  return created
}

async function ensureSubscribers() {
  let created = 0

  for (const [email, status, age] of subscriberSeeds) {
    const result = await Subscriber.updateOne(
      { email },
      {
        $setOnInsert: {
          email,
          status,
          unsubscribeToken: Subscriber.generateUnsubscribeToken(),
          ...(status === 'unsubscribed' ? { unsubscribedAt: daysAgo(age) } : {}),
          createdAt: daysAgo(age),
          updatedAt: daysAgo(age),
        },
      },
      { upsert: true, timestamps: false },
    )
    if (result.upsertedCount) created += 1
  }

  return created
}

async function ensureContacts() {
  let created = 0

  for (const [index, [name, email, subject, message, status, age]] of contactSeeds.entries()) {
    const result = await ContactMessage.updateOne(
      { _id: demoId(`contact-${index}`) },
      {
        $setOnInsert: {
          name,
          email,
          subject,
          message,
          status,
          ...(status === 'resolved' ? { handledAt: daysAgo(age - 1) } : {}),
          createdAt: daysAgo(age),
          updatedAt: daysAgo(age),
        },
      },
      { upsert: true, timestamps: false },
    )
    if (result.upsertedCount) created += 1
  }

  return created
}

async function ensureAuditEntries() {
  let created = 0

  for (const [index, [action, targetType, note, age]] of auditSeeds.entries()) {
    const result = await AuditLog.updateOne(
      { _id: demoId(`audit-${index}`) },
      {
        $setOnInsert: {
          action,
          targetType,
          targetId: demoId(`audit-target-${index}`).toString(),
          metadata: { note, source: 'demo-seed' },
          actor: 'demo-staff',
          createdAt: daysAgo(age),
          updatedAt: daysAgo(age),
        },
      },
      { upsert: true, timestamps: false },
    )
    if (result.upsertedCount) created += 1
  }

  return created
}

async function main() {
  if (!config.mongoUri) {
    console.error('MONGODB_URI is required. Copy .env.example to .env and configure it.')
    process.exit(1)
  }

  if (config.isProduction && process.env.SEED_DEMO_FORCE !== '1') {
    console.error(
      'Refusing to insert demo data with NODE_ENV=production. Set SEED_DEMO_FORCE=1 to override.',
    )
    process.exit(1)
  }

  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 })
  const productCount = await mongoose.connection.db.collection('products').countDocuments()

  if (productCount === 0) {
    console.error('No products found. Run `npm run seed` first, then `npm run seed:demo`.')
    process.exitCode = 1
    return
  }

  if (process.env.SEED_DEMO_RESET === '1') await resetDemoData()

  const stock = await ensureStock()
  const users = await ensureUsers()
  const shipping = await ensureShippingConfig()
  const orders = await ensureOrders(shipping)
  const reviewsCreated = await ensureReviews(users, orders)
  const subscribersCreated = await ensureSubscribers()
  const contactsCreated = await ensureContacts()
  const auditCreated = await ensureAuditEntries()

  console.log('')
  console.log(`Demo data ready in database "${mongoose.connection.name}".`)
  console.log(`  products:      ${productCount}`)
  console.log(
    `  inventory:     ${stock.variants} variants (${stock.inStock} in stock, ${stock.lowStock} low, ${stock.outOfStock} out)`,
  )
  console.log(`  users:         ${users.length} demo accounts`)
  console.log(`  orders:        ${orders.length} (${orders.filter((order) => order.status === 'pending').length} pending)`)
  console.log(`  reviews:       ${reviewsCreated} new, total ${await Review.countDocuments()}`)
  console.log(`  subscribers:   ${subscribersCreated} new, total ${await Subscriber.countDocuments()}`)
  console.log(`  contacts:      ${contactsCreated} new, total ${await ContactMessage.countDocuments()}`)
  console.log(`  audit entries: ${auditCreated} new, total ${await AuditLog.countDocuments()}`)
  console.log(`  shipping:      ${shipping.mode} ${shipping.value} ${shipping.currency}`)
  console.log('')
  console.log(`Sign in as ${demoUsers[0].email} / ${DEMO_PASSWORD}`)
  console.log(`Other demo accounts use the same password: ${demoUsers.slice(1).map((user) => user.email).join(', ')}`)
  const sample = orders.find((order) => order.status === 'fulfilled') ?? orders[0]
  if (sample) {
    console.log(`Track Order sample: ${sample._id} + ${sample.customer.email}`)
  }
}

try {
  await main()
} catch (error) {
  console.error(`Could not seed demo data: ${error.message}`)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
