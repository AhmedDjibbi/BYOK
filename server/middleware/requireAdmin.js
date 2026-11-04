import { timingSafeEqual } from 'node:crypto'
import { config } from '../config.js'

const adminTokens = () =>
  [...config.adminApiTokens, config.adminApiToken].filter(Boolean)

export default function requireAdmin(request, response, next) {
  const tokens = adminTokens()
  const authorization = request.get('authorization') ?? ''
  const supplied = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''

  if (!tokens.length) {
    return response.status(503).json({ error: 'Staff API is not configured.' })
  }

  const suppliedBuffer = Buffer.from(supplied)
  const authorized = tokens.some((token) => {
    const expectedBuffer = Buffer.from(token)
    return (
      expectedBuffer.length === suppliedBuffer.length &&
      timingSafeEqual(expectedBuffer, suppliedBuffer)
    )
  })

  if (!authorized) {
    return response.status(401).json({ error: 'Staff authorization required.' })
  }

  next()
}
