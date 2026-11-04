import { useEffect, useState } from 'react'
import { Cart, Close, Minus, Plus, Trash } from './Icons'
import { apiRequest } from '../lib/api'
import { calculateShipping } from '../lib/shipping'
import { MAX_LINE_QUANTITY } from '../lib/cart'
import './CartDrawer.css'

export default function CartDrawer({
  items,
  notice,
  isCheckingStock,
  onDismissNotice,
  onClose,
  onQuantityChange,
  onRemove,
  onClear,
  onStockConflict,
  onOrderComplete,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [orderId, setOrderId] = useState('')
  const [orderEmail, setOrderEmail] = useState('')
  const [notification, setNotification] = useState(null)
  const [shippingConfig, setShippingConfig] = useState(null)
  const [shippingError, setShippingError] = useState('')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  useEffect(() => {
    let controller = new AbortController()
    setShippingError('')
    apiRequest('/store-config', { signal: controller.signal })
      .then((data) => setShippingConfig(data?.shipping ?? null))
      .catch(() => setShippingError('Shipping is calculated at checkout.'))
    return () => controller.abort()
  }, [])
  const hasUnavailable = items.some(
    (item) => Number.isInteger(item.stock) && item.stock < 1,
  )
  const lineSubtotal = items.reduce((total, item) => total + item.price * item.quantity, 0)
  const totals = shippingConfig ? calculateShipping(items, shippingConfig) : null
  const currency = shippingConfig?.currency || 'TND'

  const submitOrder = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    const formData = new FormData(event.currentTarget)
    const customer = Object.fromEntries(
      ['name', 'email', 'phone', 'address', 'city'].map((field) => [
        field,
        formData.get(field),
      ]),
    )
    const website = formData.get('website')

    try {
      const data = await apiRequest('/orders', {
        method: 'POST',
        body: {
          customer,
          website,
          items: items.map((item) => ({
            productId: item.id,
            size: item.size,
            quantity: item.quantity,
          })),
        },
      })
      setOrderId(data.orderId)
      setOrderEmail(String(customer.email).trim().toLowerCase())
      setNotification(data.notification)
      try {
        window.localStorage.setItem(
          'byok-last-order',
          JSON.stringify({
            orderId: data.orderId,
            email: String(customer.email).trim().toLowerCase(),
          }),
        )
      } catch (storageError) {
        console.error('Unable to save the last order.', storageError)
      }
      onOrderComplete()
    } catch (error) {
      setSubmitError(error.message)
      if (error.status === 409) await onStockConflict()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="cart-drawer">
      <button
        type="button"
        className="cart-drawer__backdrop"
        aria-label="Close shopping bag"
        onClick={onClose}
      />
      <aside
        className="cart-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        <div className="cart-drawer__head">
          <div>
            <p className="cart-drawer__eyebrow">BYOC / Your selection</p>
            <h2 id="cart-drawer-title">Your bag ({items.reduce((count, item) => count + item.quantity, 0)})</h2>
          </div>
          <button type="button" className="cart-drawer__close" aria-label="Close bag" onClick={onClose}>
            <Close size={20} />
          </button>
        </div>

        {notice && (
          <div className="cart-drawer__alert" role="status" aria-live="polite">
            <p>{notice}</p>
            <button
              type="button"
              onClick={onDismissNotice}
              aria-label="Dismiss bag notice"
            >
              Dismiss
            </button>
          </div>
        )}
        {isCheckingStock && (
          <p className="cart-drawer__checking" role="status">
            Checking live stock…
          </p>
        )}

        {orderId ? (
          <div className="cart-drawer__success" role="status">
            <span className="cart-drawer__success-mark">BYOC</span>
            <h3>Order received.</h3>
            <p>Your order was saved to the store database.</p>
            <p className="cart-drawer__order-id">Reference: {orderId}</p>
            <p className="cart-drawer__notice">
              Your items are reserved for 72 hours while we confirm this order. If it is not confirmed by then, it is cancelled automatically and the items are released.
            </p>
            {orderEmail && (
              <a
                className="cart-drawer__track"
                href={`/order/${encodeURIComponent(orderId)}?email=${encodeURIComponent(orderEmail)}`}
              >
                Track your order
              </a>
            )}
            {notification && (
              <p className="cart-drawer__notice">
                Notifications: email {notification.email}, SMS {notification.sms}.
              </p>
            )}
            <p className="cart-drawer__notice">No payment has been processed.</p>
            <button type="button" className="cart-drawer__continue" onClick={onClose}>
              Continue shopping
            </button>
          </div>
        ) : items.length ? (
          <>
            <ul className="cart-drawer__items">
              {items.map((item) => (
                <li className="cart-item" key={item.cartKey}>
                  <div className="cart-item__visual">
                    {item.image ? (
                      <img src={item.image} alt="" />
                    ) : (
                      <span aria-hidden="true">{item.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="cart-item__details">
                    <h3>{item.name}</h3>
                    {item.colorway && <p>{item.colorway}</p>}
                    {item.size && <p>Size: {item.size}</p>}
                    {Number.isInteger(item.stock) && (
                      <p className={`cart-item__stock${item.stock < 1 ? ' is-out' : ''}`}>
                        {item.stock < 1 ? 'Out of stock' : `In stock: ${item.stock}`}
                      </p>
                    )}
                    {Number.isFinite(item.shippingOverride) && (
                      <p className="cart-item__stock">
                        Shipping: {item.shippingOverride} TND per unit
                      </p>
                    )}
                    <span>{item.price} TND</span>
                    <div className="cart-item__controls">
                      <div className="cart-item__quantity" aria-label={`Quantity: ${item.quantity}`}>
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name} quantity`}
                          onClick={() => onQuantityChange(item.cartKey, item.quantity - 1)}
                        >
                          <Minus size={13} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase ${item.name} quantity`}
                          onClick={() => onQuantityChange(item.cartKey, item.quantity + 1)}
                          disabled={
                            item.stock === 0 ||
                            item.quantity >=
                              Math.min(item.stock ?? MAX_LINE_QUANTITY, MAX_LINE_QUANTITY)
                          }
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-item__remove"
                        aria-label={`Remove ${item.name} from bag`}
                        onClick={() => onRemove(item.cartKey)}
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-drawer__foot">
              <p className="cart-drawer__subtotal">
                <span>Subtotal</span>
                <strong>{totals ? totals.subtotal : lineSubtotal} TND</strong>
              </p>
              <p className="cart-drawer__subtotal">
                <span>Shipping</span>
                <strong>
                  {shippingConfig && totals
                    ? `${totals.shippingFee} ${currency}`
                    : shippingError || 'Calculated at checkout'}
                </strong>
              </p>
              <p className="cart-drawer__subtotal cart-drawer__subtotal--total">
                <span>Total</span>
                <strong>
                  {totals
                    ? `${totals.total} TND`
                    : shippingConfig === null
                      ? 'Checking…'
                      : `${lineSubtotal} TND`}
                </strong>
              </p>
              {hasUnavailable && (
                <p className="cart-drawer__unavailable" role="alert">
                  An item in your bag is out of stock. Remove it to continue.
                </p>
              )}
              <p className="cart-drawer__notice">
                Cash on delivery. Your items are reserved for 72 hours while we confirm this order.
              </p>
              <p className="cart-drawer__notice">
                If it is not confirmed within 72 hours, it is cancelled automatically and the items are released.
              </p>
              <form className="cart-checkout" onSubmit={submitOrder}>
                <h3>Delivery details</h3>
                <label className="cart-checkout__trap" aria-hidden="true">
                  Leave this field empty
                  <input name="website" tabIndex="-1" autoComplete="off" />
                </label>
                <label>
                  Full name
                  <input name="name" autoComplete="name" minLength="2" maxLength="100" required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" autoComplete="email" maxLength="254" required />
                </label>
                <label>
                  Phone
                  <input name="phone" type="tel" autoComplete="tel" maxLength="20" required />
                </label>
                <label>
                  Address
                  <input name="address" autoComplete="street-address" minLength="5" maxLength="200" required />
                </label>
                <label>
                  City
                  <input name="city" autoComplete="address-level2" minLength="2" maxLength="100" required />
                </label>
                {submitError && <p className="cart-checkout__error" role="alert">{submitError}</p>}
                <button
                  type="submit"
                  className="cart-drawer__checkout"
                  disabled={isSubmitting || hasUnavailable}
                >
                  {isSubmitting ? 'Saving order...' : 'Place order'}
                </button>
              </form>
              <button type="button" className="cart-drawer__continue" onClick={onClose}>
                Continue shopping
              </button>
              <button
                type="button"
                className="cart-drawer__clear"
                onClick={() => {
                  if (window.confirm('Remove everything from your bag?')) onClear()
                }}
              >
                Clear bag
              </button>
            </div>
          </>
        ) : (
          <div className="cart-drawer__empty">
            <Cart size={34} />
            <p>Your bag is empty.</p>
            <button type="button" className="cart-drawer__continue" onClick={onClose}>
              Explore the collection
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
