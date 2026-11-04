export function calculateShipping(lines, shipping) {
  const mode = shipping?.mode === 'percentage' ? 'percentage' : 'fixed'
  const value = Number.isFinite(Number(shipping?.value)) ? Number(shipping.value) : 0

  const subtotal = lines.reduce((sum, line) => {
    const quantity = Math.max(0, Number(line.quantity) || 0)
    const unitPrice = Math.max(0, Number(line.price ?? line.unitPrice) || 0)
    return sum + unitPrice * quantity
  }, 0)

  let globalBase = 0
  let overrideTotal = 0
  for (const line of lines) {
    const quantity = Math.max(0, Number(line.quantity) || 0)
    const override = normalizeOverride(line.shippingOverride)
    if (override === null) {
      globalBase +=
        Math.max(0, Number(line.price ?? line.unitPrice) || 0) * quantity
    } else {
      overrideTotal += override * quantity
    }
  }

  let globalFee = 0
  if (globalBase > 0) {
    globalFee = mode === 'fixed' ? value : Math.round((globalBase * value) / 100)
  }

  return {
    subtotal,
    shippingFee: globalFee + overrideTotal,
    total: subtotal + globalFee + overrideTotal,
  }
}

function normalizeOverride(value) {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return null
  return amount
}
