import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'

const EMPTY = Object.freeze({})

let cache = null
let inflight = null
const listeners = new Set()

function notify(next) {
  listeners.forEach((listener) => listener(next))
}

function load() {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = apiRequest('/media')
      .then((data) => {
        cache = data?.media ?? EMPTY
        notify(cache)
        return cache
      })
      .catch(() => EMPTY)
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/**
 * Site-wide media overrides keyed by slot (e.g. `home.hero.1`). Every component
 * shares one fetch and one module-level cache, so the storefront stays fast.
 */
export function useSiteMedia() {
  const [media, setMedia] = useState(cache ?? EMPTY)

  useEffect(() => {
    let active = true
    const listener = (next) => {
      if (active) setMedia(next)
    }
    listeners.add(listener)
    if (cache) setMedia(cache)
    else load()
    return () => {
      active = false
      listeners.delete(listener)
    }
  }, [])

  return media
}

/** Drop the cache so the next render fetches the current overrides. */
export function refreshSiteMedia() {
  cache = null
  inflight = null
  notify(EMPTY)
  return load()
}

/** Resolve a slot to an image URL, falling back to the built-in artwork. */
export function mediaSource(media, slot, fallback = {}) {
  const asset = media?.[slot]
  const image = asset?.url || fallback.image || ''
  return {
    image,
    alt: asset?.alt || fallback.alt || '',
    overridden: Boolean(asset?.url),
  }
}
