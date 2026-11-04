import crypto from 'node:crypto'
import User from '../models/User.js'
import Session from '../models/Session.js'

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export default async function sessionAuth(request, response, next) {
  const token = request.cookies?.byok_session
  if (!token) return next()
  try {
    const session = await Session.findOne({
      tokenHash: sha256(token),
      expiresAt: { $gt: new Date() },
    })
    if (!session) return next()
    const user = await User.findById(session.userId)
    if (!user || user.status !== 'active') return next()
    request.user = user
    request.session = session
    next()
  } catch (error) {
    next(error)
  }
}
