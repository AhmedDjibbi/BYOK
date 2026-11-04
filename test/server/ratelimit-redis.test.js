import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createRateLimitMiddleware, getRateLimitStoreType } from '../../server/rateLimitStore.js'

const hasRedis = Boolean(process.env.REDIS_URL)

describe('shared Redis rate limiting', () => {
  it('uses Redis when configured', async () => {
    if (!hasRedis) return
    expect(await getRateLimitStoreType()).toBe('redis')
  })

  it('shares one limit across two applications through Redis', async () => {
    if (!hasRedis) return

    const limiters = [
      createRateLimitMiddleware({ prefix: 'rl:test:shared', windowMs: 60000, limit: 1, message: { error: 'limited' } }),
      createRateLimitMiddleware({ prefix: 'rl:test:shared', windowMs: 60000, limit: 1, message: { error: 'limited' } }),
    ]
    const apps = limiters.map((limiter) => {
      const app = express()
      app.get('/limited', limiter, (_request, response) => response.json({ ok: true }))
      return app
    })

    await request(apps[0]).get('/limited').expect(200)
    await request(apps[1]).get('/limited').expect(429)
  })
})
