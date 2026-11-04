function normalizeOverride(value) {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return null
  return amount
}

export function calculateShipping(lines, shipping = {}) {
  const shippingConfig = {
    mode: shipping.mode === 'percentage' ? 'percentage' : 'fixed',
    value: Number.isFinite(Number(shipping.value)) ? Number(shipping.value) : 0,
    currency: typeof shipping.currency === 'string' && shipping.currency ? shipping.currency.toUpperCase() : 'TND',
  }

  const subtotal = lines.reduce((sum, line) => {
    const quantity = Math.max(0, Number(line.quantity) || 0)
    const unitPrice = Math.max(0, Number(line.unitPrice) || 0)
    return sum + unitPrice * quantity
  }, 0)

  let globalBase = 0
  let overrideTotal = 0
  for (const line of lines) {
    const quantity = Math.max(0, Number(line.quantity) || 0)
    const override = normalizeOverride(line.shippingOverride)
    if (override === null) {
      globalBase += (Math.max(0, Number(line.unitPrice) || 0)) * quantity
    } else {
      overrideTotal += override * quantity
    }
  }

  let globalFee = 0
  if (globalBase > 0) {
    if (shippingConfig.mode === 'fixed') {
      globalFee = shippingConfig.value
    } else {
      globalFee = Math.round((globalBase * shippingConfig.value) / 100)
    }
  }

  const shippingFee = globalFee + overrideTotal
  const total = subtotal + shippingFee

  return {
    subtotal,
    shippingFee,
    total,
    shippingSnapshot: {
      mode: shippingConfig.mode,
      value: shippingConfig.value,
      currency: shippingConfig.currency,
      globalBase,
      overrideTotal,
    },
  }
}
