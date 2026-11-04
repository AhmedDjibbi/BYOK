import rateLimit from 'express-rate-limit'
import crypto from 'node:crypto'
import { promisify } from 'node:util'
import User from '../models/User.js'
import LoginToken from '../models/LoginToken.js'
import Session from '../models/Session.js'
import sessionAuth from '../middleware/sessionAuth.js'
import { config } from '../config.js'
import { sendNotifications } from '../services/notifications.js'

const scrypt = promisify(crypto.scrypt)
const PASSWORD_KEY_LENGTH = 64

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
})

const requestLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
})

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
})

const router = (await import('express')).Router()
router.use(sessionAuth)

const perEmailAttempts = new Map()
function emailRateLimited(email) {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const max = 3
  const attempts = (perEmailAttempts.get(email) || []).filter((time) => now - time < windowMs)
  if (attempts.length >= max) return true
  attempts.push(now)
  perEmailAttempts.set(email, attempts)
  return false
}

function emailPatternValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function publicUrl(request) {
  return String(process.env.PUBLIC_URL || `${request.protocol}://${request.get('host')}`).replace(/\/+$/, '')
}

function cookieFlags() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  }
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, PASSWORD_KEY_LENGTH)
  return `scrypt:${salt}:${derived.toString('hex')}`
}

async function passwordMatches(password, storedHash) {
  const [scheme, salt, hash] = String(storedHash).split(':')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const derived = await scrypt(password, salt, PASSWORD_KEY_LENGTH)
  const expected = Buffer.from(hash, 'hex')
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived)
}

let dummyPasswordHash
async function getDummyPasswordHash() {
  dummyPasswordHash ??= hashPassword(crypto.randomBytes(32).toString('hex'))
  return dummyPasswordHash
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    addresses: user.addresses,
    wishlist: user.wishlist,
    isVerified: Boolean(user.emailVerifiedAt),
  }
}

async function establishSession(request, response, user) {
  const rawSessionToken = crypto.randomBytes(32).toString('hex')
  await Session.create({
    userId: user._id,
    tokenHash: sha256(rawSessionToken),
    expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
    userAgent: String(request.get('user-agent') || '').slice(0, 256),
    ip: String(request.ip || '').slice(0, 128),
  })

  const csrfToken = crypto.randomBytes(24).toString('hex')
  response.cookie('byok_session', rawSessionToken, { ...cookieFlags(), maxAge: SESSION_EXPIRY_MS })
  response.cookie('csrf_token', csrfToken, {
    httpOnly: false,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_EXPIRY_MS,
  })

  return { user: publicUser(user), csrfToken }
}

const TOKEN_EXPIRY_MS = 15 * 60 * 1000
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

router.post('/register', authLimiter, async (request, response, next) => {
  try {
    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : ''
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    const password = typeof request.body?.password === 'string' ? request.body.password : ''

    if (!name) return response.status(400).json({ error: 'Please enter your name.' })
    if (name.length > 100) {
      return response.status(400).json({ error: 'Your name must be 100 characters or fewer.' })
    }
    if (!emailPatternValid(email)) {
      return response.status(400).json({ error: 'Enter a valid email address.' })
    }
    if (password.length < 8) {
      return response.status(400).json({ error: 'Your password must be at least 8 characters.' })
    }
    if (password.length > 128) {
      return response.status(400).json({ error: 'Your password must be 128 characters or fewer.' })
    }

    const passwordHash = await hashPassword(password)
    if (await User.exists({ email })) {
      return response.status(409).json({ error: 'An account with this email already exists.' })
    }

    let user
    try {
      user = await User.create({ name, email, passwordHash })
    } catch (error) {
      if (error?.code === 11000) {
        return response.status(409).json({ error: 'An account with this email already exists.' })
      }
      throw error
    }

    response.status(201).json(await establishSession(request, response, user))
  } catch (error) {
    next(error)
  }
})

router.post('/login', authLimiter, async (request, response, next) => {
  try {
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    const password = typeof request.body?.password === 'string' ? request.body.password : ''

    if (!emailPatternValid(email) || !password) {
      return response.status(401).json({ error: 'Invalid email or password.' })
    }

    const user = await User.findOne({ email }).select('+passwordHash')
    if (!user?.passwordHash) {
      await passwordMatches(password, await getDummyPasswordHash())
      return response.status(401).json({ error: 'Invalid email or password.' })
    }
    if (!(await passwordMatches(password, user.passwordHash))) {
      return response.status(401).json({ error: 'Invalid email or password.' })
    }
    if (user.status !== 'active') {
      return response.status(403).json({ error: 'This account has been disabled.' })
    }

    response.json(await establishSession(request, response, user))
  } catch (error) {
    next(error)
  }
})

router.post('/request-link', requestLinkLimiter, async (request, response, next) => {
  try {
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    const honeypot = typeof request.body?.website === 'string' ? request.body.website.trim() : ''
    if (honeypot) return response.status(200).json({ message: 'Link sent.' })

    if (emailPatternValid(email) && !emailRateLimited(email)) {
      const rawToken = crypto.randomBytes(32).toString('hex')
      await LoginToken.create({
        email,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
      })
      const link = `${publicUrl(request)}/verify?token=${rawToken}`
      await sendNotifications({
        subject: 'BYOC sign-in link',
        text: `Your BYOC sign-in link is: ${link}\nIt expires in 15 minutes. If you did not request it, you can ignore this email.`,
        customerEmail: email,
      })
    }

    response.status(200).json({ message: 'If that email is eligible, a sign-in link has been sent.' })
  } catch (error) {
    next(error)
  }
})

router.post('/verify', verifyLimiter, async (request, response, next) => {
  try {
    const token = typeof request.body?.token === 'string' ? request.body.token.trim() : ''
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return response.status(400).json({ error: 'Sign-in token is invalid.' })
    }

    const loginToken = await LoginToken.findOne({ tokenHash: sha256(token) })
    if (!loginToken || loginToken.usedAt || loginToken.expiresAt <= new Date()) {
      return response.status(400).json({ error: 'Sign-in token is invalid or has expired.' })
    }

    loginToken.usedAt = new Date()
    await loginToken.save()

    const user = await User.findOneAndUpdate(
      { email: loginToken.email },
      { $set: { emailVerifiedAt: new Date() }, $setOnInsert: { email: loginToken.email } },
      { upsert: true, returnDocument: 'after' },
    )

    response.json(await establishSession(request, response, user))
  } catch (error) {
    next(error)
  }
})

router.post('/logout', async (request, response, next) => {
  try {
    const token = request.cookies?.byok_session
    if (token) {
      await Session.deleteOne({ tokenHash: sha256(token) })
    }
    response.clearCookie('byok_session', cookieFlags())
    response.clearCookie('csrf_token', { path: '/' })
    response.status(204).send()
  } catch (error) {
    next(error)
  }
})

router.get('/me', async (request, response, next) => {
  try {
    // sessionAuth middleware is mounted for this router.
    const user = request.user
    if (!user) return response.status(401).json({ error: 'Authentication required.' })
    response.json({
      user: publicUser(user),
      csrfToken: request.cookies?.csrf_token ?? null,
    })
  } catch (error) {
    next(error)
  }
})

router.use('/me', sessionAuth)
router.use('/logout', sessionAuth)
export default router
