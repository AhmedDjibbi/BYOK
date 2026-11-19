const SLOT_PATTERN = /^[a-z0-9][a-z0-9.-]{0,119}$/i
const DATA_URL_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i

export const MAX_MEDIA_BYTES = 2_500_000

export const MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
])

export function isValidSlot(slot) {
  return typeof slot === 'string' && SLOT_PATTERN.test(slot)
}

export function parseImageDataUrl(value) {
  if (typeof value !== 'string') return { error: 'Provide an image file.' }
  const match = DATA_URL_PATTERN.exec(value)
  if (!match) return { error: 'The uploaded file is not a valid image payload.' }

  const mimeType = match[1].toLowerCase()
  if (!MEDIA_MIME_TYPES.has(mimeType)) {
    return { error: 'Use a JPEG, PNG, WebP, AVIF, or GIF image.' }
  }

  const buffer = Buffer.from(match[2], 'base64')
  if (!buffer.length) return { error: 'The uploaded image is empty.' }
  if (buffer.length > MAX_MEDIA_BYTES) {
    return {
      error: `Images must be smaller than ${Math.round(MAX_MEDIA_BYTES / 1_000_000)} MB. Optimise the file or paste an external URL instead.`,
    }
  }

  return { mimeType, buffer }
}

export function normalizeExternalUrl(value) {
  if (typeof value !== 'string') return { error: 'Enter an image URL.' }
  const trimmed = value.trim()
  if (!trimmed) return { error: 'Enter an image URL.' }
  if (trimmed.length > 2000) return { error: 'That URL is too long.' }

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return { error: 'Enter a valid URL, including https://.' }
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    return { error: 'Image URLs must use http or https.' }
  }

  return { url: parsed.toString() }
}

export function mediaUrl(asset) {
  if (asset.externalUrl) return asset.externalUrl
  const version = asset.updatedAt ? new Date(asset.updatedAt).getTime() : 0
  return `/api/media/${encodeURIComponent(asset.slot)}?v=${version}`
}

export function toPublicAsset(asset) {
  return {
    slot: asset.slot,
    alt: asset.alt ?? '',
    url: mediaUrl(asset),
    mimeType: asset.mimeType ?? null,
    size: asset.size ?? 0,
    kind: asset.externalUrl ? 'external' : 'upload',
    updatedAt: asset.updatedAt ?? null,
  }
}
