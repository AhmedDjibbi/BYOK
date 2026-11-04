import { describe, expect, it } from 'vitest'
import { calculateShipping } from '../../server/services/shipping.js'

describe('calculateShipping', () => {
  it('charges the global fixed amount once when no overrides are present', () => {
    const result = calculateShipping(
      [
        { unitPrice: 79, quantity: 1, shippingOverride: null },
        { unitPrice: 129, quantity: 2, shippingOverride: null },
      ],
      { mode: 'fixed', value: 7, currency: 'TND' },
    )

    expect(result.subtotal).toBe(337)
    expect(result.shippingFee).toBe(7)
    expect(result.total).toBe(344)
  })

  it('percentage mode rounds to the nearest unit', () => {
    const result = calculateShipping(
      [{ unitPrice: 99, quantity: 1, shippingOverride: null }],
      { mode: 'percentage', value: 7.5, currency: 'TND' },
    )
    expect(result.shippingFee).toBe(7)
  })

  it('charges a product override per unit instead of the global fee when it is the only item', () => {
    const result = calculateShipping(
      [{ unitPrice: 100, quantity: 2, shippingOverride: 4 }],
      { mode: 'fixed', value: 7, currency: 'TND' },
    )
    expect(result.subtotal).toBe(200)
    expect(result.shippingFee).toBe(8)
    expect(result.total).toBe(208)
  })

  it('mixed carts charge the global fee once plus every override', () => {
    const result = calculateShipping(
      [
        { unitPrice: 100, quantity: 1, shippingOverride: 4 },
        { unitPrice: 50, quantity: 2, shippingOverride: null },
      ],
      { mode: 'fixed', value: 7, currency: 'TND' },
    )
    expect(result.subtotal).toBe(200)
    expect(result.shippingFee).toBe(4 + 7)
    expect(result.total).toBe(211)
  })

  it('charges no global fee when every line is overridden, even at 100%', () => {
    const result = calculateShipping(
      [{ unitPrice: 100, quantity: 1, shippingOverride: 10 }],
      { mode: 'percentage', value: 100, currency: 'TND' },
    )
    expect(result.shippingFee).toBe(10)
  })

  it('handles an empty cart without charging shipping', () => {
    const result = calculateShipping([], { mode: 'fixed', value: 7, currency: 'TND' })
    expect(result.subtotal).toBe(0)
    expect(result.shippingFee).toBe(0)
    expect(result.total).toBe(0)
  })
})
