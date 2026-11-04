import StoreSetting from '../models/StoreSetting.js'
import { config } from '../config.js'

let shippingConfigVersion = 1

export function bumpShippingConfigVersion() {
  shippingConfigVersion += 1
}

export function getShippingConfigVersion() {
  return shippingConfigVersion
}
export async function getStoreSettings() {
  let settings = await StoreSetting.findOne({ key: 'store' })
  if (!settings) {
    settings = await StoreSetting.create({
      key: 'store',
      shipping: {
        mode: config.shipping.mode,
        value: config.shipping.value,
        currency: config.shipping.currency,
      },
    })
  }
  return settings
}

export async function getShippingConfig() {
  const settings = await getStoreSettings()
  return {
    mode: settings.shipping.mode,
    value: settings.shipping.value,
    currency: settings.shipping.currency,
  }
}

export function validateShippingConfig(input) {
  const mode = input?.mode
  const value = Number(input?.value)
  const currency = typeof input?.currency === 'string' ? input.currency.trim().toUpperCase() : ''

  if (!['fixed', 'percentage'].includes(mode)) {
    throw new Error('Shipping mode must be "fixed" or "percentage".')
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Shipping value must be a number of at least 0.')
  }
  if (mode === 'percentage' && value > 100) {
    throw new Error('Shipping percentage cannot exceed 100.')
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Shipping currency must be a three-letter code.')
  }
  return { mode, value, currency }
}

export async function updateShippingConfig(input) {
  const validated = validateShippingConfig(input)
  const settings = await getStoreSettings()
  settings.shipping = validated
  return settings.save()
}
