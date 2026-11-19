import { Router } from 'express'
import MediaAsset from '../models/MediaAsset.js'
import { recordAudit } from '../services/audit.js'
import {
  isValidSlot,
  mediaUrl,
  normalizeExternalUrl,
  parseImageDataUrl,
  toPublicAsset,
} from '../services/media.js'

export const publicMediaRouter = Router()
export const adminMediaRouter = Router()

publicMediaRouter.get('/media', async (_request, response, next) => {
  try {
    const assets = await MediaAsset.find()
      .select('slot alt externalUrl mimeType size updatedAt')
      .lean()
    const media = {}
    for (const asset of assets) {
      media[asset.slot] = {
        url: mediaUrl(asset),
        alt: asset.alt ?? '',
        mimeType: asset.mimeType ?? null,
        updatedAt: asset.updatedAt ?? null,
      }
    }
    response.set('Cache-Control', 'public, max-age=60')
    response.json({ media })
  } catch (error) {
    next(error)
  }
})

publicMediaRouter.get('/media/:slot', async (request, response, next) => {
  try {
    const { slot } = request.params
    if (!isValidSlot(slot)) return response.status(404).json({ error: 'Media not found.' })

    const asset = await MediaAsset.findOne({ slot })
    if (!asset) return response.status(404).json({ error: 'Media not found.' })
    if (asset.externalUrl) return response.redirect(302, asset.externalUrl)
    if (!asset.data?.length) return response.status(404).json({ error: 'Media not found.' })

    response.set('Content-Type', asset.mimeType || 'application/octet-stream')
    response.set('Cache-Control', 'public, max-age=31536000, immutable')
    response.set('X-Content-Type-Options', 'nosniff')
    return response.send(asset.data)
  } catch (error) {
    next(error)
  }
})

adminMediaRouter.get('/', async (_request, response, next) => {
  try {
    const assets = await MediaAsset.find()
      .select('slot alt externalUrl mimeType size updatedAt')
      .sort({ slot: 1 })
      .lean()
    response.set('Cache-Control', 'no-store')
    response.json({ assets: assets.map(toPublicAsset) })
  } catch (error) {
    next(error)
  }
})

adminMediaRouter.put('/:slot', async (request, response, next) => {
  try {
    const { slot } = request.params
    if (!isValidSlot(slot)) {
      return response.status(400).json({ error: 'That media slot name is not valid.' })
    }

    const { dataUrl, url, alt } = request.body ?? {}
    const existing = await MediaAsset.findOne({ slot })
    const updates = {}

    if (alt !== undefined) {
      if (typeof alt !== 'string' || alt.length > 200) {
        return response.status(400).json({ error: 'Alt text must be 200 characters or fewer.' })
      }
      updates.alt = alt.trim()
    }

    if (typeof dataUrl === 'string' && dataUrl.length > 0) {
      const parsed = parseImageDataUrl(dataUrl)
      if (parsed.error) return response.status(400).json({ error: parsed.error })
      updates.data = parsed.buffer
      updates.mimeType = parsed.mimeType
      updates.size = parsed.buffer.length
      updates.externalUrl = null
    } else if (typeof url === 'string' && url.trim()) {
      const parsed = normalizeExternalUrl(url)
      if (parsed.error) return response.status(400).json({ error: parsed.error })
      updates.externalUrl = parsed.url
      updates.data = null
      updates.mimeType = null
      updates.size = 0
    } else if (!existing) {
      return response.status(400).json({ error: 'Upload an image or provide an image URL.' })
    }

    const asset = await MediaAsset.findOneAndUpdate(
      { slot },
      { $set: { ...updates, slot } },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
    )

    recordAudit(request, {
      action: 'media.update',
      targetType: 'media',
      targetId: slot,
      metadata: { kind: updates.data ? 'upload' : updates.externalUrl ? 'external' : 'alt' },
    })

    response.json({ asset: toPublicAsset(asset) })
  } catch (error) {
    next(error)
  }
})

adminMediaRouter.delete('/:slot', async (request, response, next) => {
  try {
    const { slot } = request.params
    if (!isValidSlot(slot)) {
      return response.status(400).json({ error: 'That media slot name is not valid.' })
    }

    const deleted = await MediaAsset.findOneAndDelete({ slot })
    if (!deleted) return response.status(404).json({ error: 'Media not found.' })

    recordAudit(request, {
      action: 'media.reset',
      targetType: 'media',
      targetId: slot,
      metadata: {},
    })

    response.status(204).send()
  } catch (error) {
    next(error)
  }
})
