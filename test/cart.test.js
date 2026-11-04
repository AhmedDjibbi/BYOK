import { describe, expect, it } from 'vitest'
import {
  CART_STORAGE_KEY,
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  cartKeyFor,
  describeCartChanges,
  loadCart,
  reconcileCart,
  sanitizeCartLines,
  storeCart,
} from '../src/lib/cart.js'

const createStorage = () => {
  const values = new Map()
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    dump: () => values,
  }
}

describe('sanitizeCartLines', () => {
  it('keeps valid lines and rebuilds the cart key', () => {
    const { lines, dropped } = sanitizeCartLines({
      lines: [
        { id: 'tee', size: 'M', quantity: 2, name: 'Tee', price: 79 },
        { id: 'hoodie', size: 'L', quantity: 1, name: 'Hoodie', price: 129 },
      ],
    })

    expect(dropped).toBe(0)
    expect(lines).toEqual([
      {
        cartKey: cartKeyFor('tee', 'M'),
        id: 'tee',
        size: 'M',
        quantity: 2,
        name: 'Tee',
        price: 79,
        colorway: '',
        stock: null,
        shippingOverride: null,
      },
      expect.objectContaining({ cartKey: cartKeyFor('hoodie', 'L'), quantity: 1 }),
    ])
  })

  it('drops malformed rows and clamps quantities', () => {
    const { lines, dropped } = sanitizeCartLines([
      null,
      { id: '', size: 'M', quantity: 1 },
      { id: 'tee', size: 'M', quantity: 0 },
      { id: 'tee', size: 'M', quantity: 12 },
      { id: 'tee', size: 'M', quantity: 5 },
    ])

    expect(dropped).toBe(3)
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(MAX_LINE_QUANTITY)
  })

  it('caps the number of lines', () => {
    const rows = Array.from({ length: MAX_CART_LINES + 4 }, (_, index) => ({
      id: `product-${index}`,
      size: 'M',
      quantity: 1,
    }))

    const { lines, dropped } = sanitizeCartLines(rows)
    expect(lines).toHaveLength(MAX_CART_LINES)
    expect(dropped).toBe(4)
  })
})

describe('reconcileCart', () => {
  const products = [
    {
      id: 'tee',
      name: 'Core Tee',
      price: 89,
      colorway: 'Black',
      sizes: ['S', 'M'],
      stockBySize: { S: 0, M: 3 },
    },
  ]

  it('removes deleted products, missing sizes and sold-out lines', () => {
    const result = reconcileCart(
      [
        { cartKey: 'gone::M', id: 'gone', size: 'M', quantity: 1, name: 'Gone' },
        { cartKey: 'tee::L', id: 'tee', size: 'L', quantity: 1, name: 'Core Tee' },
        { cartKey: 'tee::S', id: 'tee', size: 'S', quantity: 1, name: 'Core Tee' },
      ],
      products,
    )

    expect(result.lines).toHaveLength(0)
    expect(result.removed).toHaveLength(3)
  })

  it('clamps quantity to available stock and refreshes the snapshot', () => {
    const result = reconcileCart(
      [
        {
          cartKey: 'tee::M',
          id: 'tee',
          size: 'M',
          quantity: 8,
          name: 'Old name',
          price: 1,
          colorway: 'Grey',
        },
      ],
      products,
    )

    expect(result.removed).toHaveLength(0)
    expect(result.clamped).toHaveLength(1)
    expect(result.clamped[0]).toMatchObject({ quantity: 3, available: 3 })
    expect(result.lines[0]).toMatchObject({
      name: 'Core Tee',
      price: 89,
      colorway: 'Black',
      stock: 3,
      quantity: 3,
    })
  })
})

describe('describeCartChanges', () => {
  it('explains removals and clamped quantities', () => {
    const message = describeCartChanges({
      removed: [{ id: 'tee', name: 'Core Tee', size: 'S' }],
      clamped: [
        {
          id: 'hoodie',
          name: 'Hoodie',
          size: 'L',
          available: 2,
          quantity: 2,
        },
      ],
      dropped: 1,
    })

    expect(message).toContain('1 saved bag item was ignored')
    expect(message).toContain('Core Tee (S)')
    expect(message).toContain('Only 2 left of Hoodie (L)')
  })
})

describe('loadCart and storeCart', () => {
  it('round-trips a bag through the byok-cart:v1 key', () => {
    const storage = createStorage()
    storeCart(
      [
        {
          cartKey: 'tee::M',
          id: 'tee',
          size: 'M',
          quantity: 2,
          name: 'Tee',
          price: 79,
          colorway: 'Black',
          stock: 5,
        },
      ],
      storage,
    )

    expect(storage.dump().has(CART_STORAGE_KEY)).toBe(true)
    const loaded = loadCart(storage)
    expect(loaded.notice).toBe('')
    expect(loaded.lines[0]).toMatchObject({
      id: 'tee',
      size: 'M',
      quantity: 2,
      name: 'Tee',
      price: 79,
    })
  })

  it('clears storage when the bag is empty', () => {
    const storage = createStorage()
    storeCart([{ id: 'tee', size: 'M', quantity: 1 }], storage)
    storeCart([], storage)
    expect(storage.dump().has(CART_STORAGE_KEY)).toBe(false)
  })

  it('handles unreadable data without throwing', () => {
    const storage = createStorage()
    storage.setItem(CART_STORAGE_KEY, '{nope')
    const loaded = loadCart(storage)
    expect(loaded.lines).toEqual([])
    expect(loaded.notice).toContain('could not be read')
  })
})
