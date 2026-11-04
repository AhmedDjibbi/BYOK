export const CART_STORAGE_KEY = 'byok-cart:v1'
export const MAX_CART_LINES = 30
export const MAX_LINE_QUANTITY = 10

export const cartKeyFor = (id, size = '') => `${id}::${size}`

const asText = (value, maxLength) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

const asMoney = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : 0
}

const asStock = (value) => {
  const amount = Number(value)
  return Number.isInteger(amount) && amount >= 0 ? amount : null
}

const asOptionalNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

/**
 * Turns anything read from storage into safe cart lines.
 * Only the id, size and quantity are required; display fields are optional snapshots.
 */
export function sanitizeCartLines(input) {
  const source = Array.isArray(input)
    ? input
    : Array.isArray(input?.lines)
      ? input.lines
      : []
  const lines = []
  const byKey = new Map()
  let dropped = 0

  for (const entry of source) {
    if (!entry || typeof entry !== 'object') {
      dropped += 1
      continue
    }

    const id = asText(entry.id, 120)
    const size = asText(entry.size, 20)
    const quantity = Number(entry.quantity)
    if (!id || !Number.isInteger(quantity) || quantity < 1) {
      dropped += 1
      continue
    }

    const cartKey = cartKeyFor(id, size)
    const capped = Math.min(quantity, MAX_LINE_QUANTITY)
    const existing = byKey.get(cartKey)
    if (existing) {
      existing.quantity = Math.min(existing.quantity + capped, MAX_LINE_QUANTITY)
      continue
    }

    if (lines.length >= MAX_CART_LINES) {
      dropped += 1
      continue
    }

    const line = {
      cartKey,
      id,
      size,
      quantity: capped,
      name: asText(entry.name, 200) || 'Saved item',
      price: asMoney(entry.price),
      colorway: asText(entry.colorway, 120),
      stock: asStock(entry.stock),
      shippingOverride: asOptionalNumber(entry.shippingOverride),
    }
    byKey.set(cartKey, line)
    lines.push(line)
  }

  return { lines, dropped }
}

/**
 * Compares the bag with the live catalogue and drops or clamps anything stale.
 * `clamped` keeps the original quantity and the stock that forced the change.
 */
export function reconcileCart(lines, products) {
  const catalogue = new Map()
  for (const product of products ?? []) {
    if (product && typeof product.id === 'string') catalogue.set(product.id, product)
  }

  const next = []
  const removed = []
  const clamped = []

  for (const line of lines ?? []) {
    const product = catalogue.get(line.id)
    const sizes = Array.isArray(product?.sizes) ? product.sizes : []
    if (!product || !sizes.includes(line.size)) {
      removed.push(line)
      continue
    }

    const available = Math.max(
      0,
      Math.floor(Number(product.stockBySize?.[line.size] ?? 0)) || 0,
    )
    if (available < 1) {
      removed.push(line)
      continue
    }

    const quantity = Math.min(Math.max(1, line.quantity), available, MAX_LINE_QUANTITY)
    if (quantity < line.quantity) clamped.push({ ...line, available, quantity })

    next.push({
      ...line,
      name: typeof product.name === 'string' && product.name ? product.name : line.name,
      price: asMoney(product.price),
      colorway:
        typeof product.colorway === 'string' ? product.colorway : line.colorway,
      stock: available,
      shippingOverride: asOptionalNumber(product.shippingOverride ?? line.shippingOverride),
      quantity,
    })
  }

  return { lines: next, removed, clamped }
}

const lineLabel = (line) =>
  line.size ? `${line.name || line.id} (${line.size})` : line.name || line.id

export function describeCartChanges({ removed = [], clamped = [], dropped = 0 } = {}) {
  const parts = []

  if (dropped > 0) {
    parts.push(
      `${dropped} saved bag ${dropped === 1 ? 'item was' : 'items were'} ignored because the saved data was incomplete.`,
    )
  }

  if (removed.length === 1) {
    parts.push(
      `1 item is no longer available and was removed: ${lineLabel(removed[0])}.`,
    )
  } else if (removed.length > 1) {
    const names = removed.slice(0, 3).map(lineLabel).join(', ')
    parts.push(
      `${removed.length} items are no longer available and were removed: ${names}${removed.length > 3 ? ', …' : ''}.`,
    )
  }

  for (const line of clamped.slice(0, 3)) {
    parts.push(
      `Only ${line.available} left of ${lineLabel(line)}, so the quantity is now ${line.quantity}.`,
    )
  }
  if (clamped.length > 3) {
    parts.push(`${clamped.length - 3} more quantities were adjusted to match stock.`)
  }

  return parts.join(' ')
}

const defaultStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function loadCart(storage = defaultStorage()) {
  if (!storage) return { lines: [], notice: '' }

  let raw = null
  try {
    raw = storage.getItem(CART_STORAGE_KEY)
  } catch {
    return { lines: [], notice: '' }
  }
  if (!raw) return { lines: [], notice: '' }

  try {
    const { lines, dropped } = sanitizeCartLines(JSON.parse(raw))
    return { lines, notice: describeCartChanges({ dropped }) }
  } catch {
    return { lines: [], notice: 'Your saved bag could not be read, so it was cleared.' }
  }
}

export function storeCart(lines, storage = defaultStorage()) {
  if (!storage) return
  try {
    if (!lines.length) {
      storage.removeItem(CART_STORAGE_KEY)
      return
    }
    storage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        lines: lines.map(({ id, size, quantity, name, price, colorway, shippingOverride }) => ({
          id,
          size,
          quantity,
          name,
          price,
          colorway,
          shippingOverride,
        })),
      }),
    )
  } catch (error) {
    console.error('Unable to save the bag.', error)
  }
}
