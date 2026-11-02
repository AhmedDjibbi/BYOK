import { timingSafeEqual } from 'node:crypto'

export default function requireAdmin(request, response, next) {
  const expected = process.env.ADMIN_API_TOKEN
  const authorization = request.get('authorization') ?? ''
  const supplied = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''

  if (!expected) {
    return response.status(503).json({ error: 'Staff API is not configured.' })
  }

  const expectedBuffer = Buffer.from(expected)
  const suppliedBuffer = Buffer.from(supplied)
  const authorized =
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)

  if (!authorized) {
    return response.status(401).json({ error: 'Staff authorization required.' })
  }

  next()
}
