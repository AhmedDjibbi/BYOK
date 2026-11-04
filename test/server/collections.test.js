import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import request from 'supertest'
import { createApp } from '../../server/app.js'
import Collection from '../../server/models/Collection.js'
import Inventory from '../../server/models/Inventory.js'
import Product from '../../server/models/Product.js'

let app
let mongoLike

beforeAll(async () => {
  const baseUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI
  if (baseUri) {
    const url = new URL(baseUri)
    url.pathname = `/byok_collections_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    await mongoose.connect(url.toString(), { serverSelectionTimeoutMS: 5000 })
  } else {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    mongoLike = await MongoMemoryServer.create()
    await mongoose.connect(mongoLike.getUri())
  }
  app = createApp()

  const collection = await Collection.create({
    slug: 'tshirts',
    name: 'T-Shirts',
    active: true,
  })

  await Product.create({
    productId: 'collection-test-tee',
    name: 'Collection Tee',
    price: 79,
    category: 'tshirts',
    collectionId: collection._id,
    active: true,
    badge: 'New',
    garment: { type: 'tee', body: '#131313', trim: '#3a3a3a', print: 'logo' },
    colors: ['#1c1c1c'],
    activeColor: 0,
    sizes: ['S'],
    color: '#1c1c1c',
    colorway: 'Black',
    added: 0,
  })
  await Inventory.create({ productId: 'collection-test-tee', size: 'S', quantity: 2 })
}, 120000)

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
  if (mongoLike) await mongoLike.stop()
})

describe('collections API', () => {
  it('lists active collections with derived counts', async () => {
    const response = await request(app).get('/api/collections').expect(200)
    expect(response.body.collections).toContainEqual(
      expect.objectContaining({ slug: 'tshirts', name: 'T-Shirts', productCount: 1 }),
    )
  })

  it('attaches a collection to each product', async () => {
    const response = await request(app).get('/api/products').expect(200)
    const product = response.body.products.find((item) => item.id === 'collection-test-tee')
    expect(product.collection).toMatchObject({ slug: 'tshirts', name: 'T-Shirts' })
  })

  it('filters products by collection slug', async () => {
    const match = await request(app).get('/api/products?collection=tshirts').expect(200)
    expect(match.body.products).toHaveLength(1)

    const different = await request(app).get('/api/products?collection=hoodies').expect(200)
    expect(different.body.products).toHaveLength(0)
  })
})
