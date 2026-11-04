import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../../server/app.js'
import User from '../../server/models/User.js'

let mongo
let app

beforeAll(async () => {
  const baseUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI
  if (baseUri) {
    const testUri = new URL(baseUri)
    testUri.pathname = `/byok_auth_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    await mongoose.connect(testUri.toString())
  } else {
    mongo = await MongoMemoryServer.create()
    await mongoose.connect(mongo.getUri())
  }
  app = createApp()
}, 120000)

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
  if (mongo) await mongo.stop()
})

describe('password authentication', () => {
  const credentials = {
    name: 'Test Member',
    email: 'member@byoc.test',
    password: 'correct-horse-battery',
  }

  it('creates an account, hashes the password and starts a session', async () => {
    const agent = request.agent(app)
    const response = await agent.post('/api/auth/register').send(credentials).expect(201)

    expect(response.body.user).toMatchObject({
      name: 'Test Member',
      email: 'member@byoc.test',
    })
    expect(response.body.user.passwordHash).toBeUndefined()
    expect(response.body.csrfToken).toBeTruthy()
    expect(response.headers['set-cookie'].join(';')).toContain('byok_session=')

    const stored = await User.findOne({ email: credentials.email }).select('+passwordHash')
    expect(stored.passwordHash).toMatch(/^scrypt:/)
    expect(stored.passwordHash).not.toContain(credentials.password)

    const me = await agent.get('/api/auth/me').expect(200)
    expect(me.body.user.email).toBe(credentials.email)

    const profile = await agent.get('/api/account/profile').expect(200)
    expect(profile.body.user.passwordHash).toBeUndefined()
  })

  it('rejects duplicate accounts and invalid passwords', async () => {
    await request(app).post('/api/auth/register').send(credentials).expect(409)
    await request(app)
      .post('/api/auth/register')
      .send({ ...credentials, email: 'other@byoc.test', password: 'short' })
      .expect(400)
    await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' })
      .expect(401)
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'missing@byoc.test', password: credentials.password })
      .expect(401)
  })

  it('signs in with the right password and rejects unauthenticated requests', async () => {
    await request(app).get('/api/auth/me').expect(401)

    const agent = request.agent(app)
    const response = await agent
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200)

    expect(response.body.user.email).toBe(credentials.email)
    expect(response.headers['set-cookie'].join(';')).toContain('byok_session=')

    const me = await agent.get('/api/auth/me').expect(200)
    expect(me.body.user.email).toBe(credentials.email)
  })
})
