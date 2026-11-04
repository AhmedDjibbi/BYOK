import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../../server/app.js'
import Inventory from '../../server/models/Inventory.js'
import Product from '../../server/models/Product.js'

let mongo
let app

beforeAll(async () => {
  const baseUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI
  if (baseUri) {
    const testUri = new URL(baseUri)
    testUri.pathname = `/byok_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await mongoose.connect(testUri.toString())
  } else {
    mongo = await MongoMemoryServer.create()
    await mongoose.connect(mongo.getUri())
  }
  app = createApp()

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
  await Inventory.create([
    { productId: 'test-tee-black', size: 'S', quantity: 0 },
    { productId: 'test-tee-black', size: 'M', quantity: 3 },
  ])
}, 120000)

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
  if (mongo) await mongo.stop()
})

describe('public API', () => {
  it('reports database health', async () => {
    const response = await request(app).get('/api/health').expect(200)
    expect(response.body.status).toBe('ok')
    expect(response.body.database).toBe('connected')
  })

  it('returns the catalogue with size-level stock', async () => {
    const response = await request(app).get('/api/products').expect(200)
    expect(response.body.products).toHaveLength(1)
    expect(response.body.products[0]).toMatchObject({
      id: 'test-tee-black',
      name: 'Test Tee',
      price: 79,
      stockBySize: { S: 0, M: 3 },
    })
  })

  it('rejects an invalid order payload', async () => {
    const response = await request(app).post('/api/orders').send({}).expect(400)
    expect(response.body.error).toBeTruthy()
  })

  it('returns a JSON 404 for unknown API routes', async () => {
    const response = await request(app).get('/api/nope').expect(404)
    expect(response.body.error).toBe('Route not found.')
  })
})
