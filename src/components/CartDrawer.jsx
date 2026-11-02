import { useEffect, useState } from 'react'
import { Cart, Close, Minus, Plus, Trash } from './Icons'
import './CartDrawer.css'

export default function CartDrawer({
  items,
  onClose,
  onQuantityChange,
  onRemove,
  onOrderComplete,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [orderId, setOrderId] = useState('')
  const [notification, setNotification] = useState(null)

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

  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0)

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
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          website,
          items: items.map((item) => ({
            productId: item.id,
            size: item.size,
            quantity: item.quantity,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save your order.')
      setOrderId(data.orderId)
      setNotification(data.notification)
      onOrderComplete()
    } catch (error) {
      setSubmitError(error.message)
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
            <p className="cart-drawer__eyebrow">BYOK / Your selection</p>
            <h2 id="cart-drawer-title">Your bag ({items.reduce((count, item) => count + item.quantity, 0)})</h2>
          </div>
          <button type="button" className="cart-drawer__close" aria-label="Close bag" onClick={onClose}>
            <Close size={20} />
          </button>
        </div>

        {orderId ? (
          <div className="cart-drawer__success" role="status">
            <span className="cart-drawer__success-mark">BYOK</span>
            <h3>Order received.</h3>
            <p>Your order was saved to the store database.</p>
            <p className="cart-drawer__order-id">Reference: {orderId}</p>
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
                          disabled={item.quantity >= 10}
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
                <strong>{subtotal} TND</strong>
              </p>
              <p className="cart-drawer__notice">
                Cash on delivery. Orders are stored securely and remain pending until confirmed.
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving order...' : 'Place order'}
                </button>
              </form>
              <button type="button" className="cart-drawer__continue" onClick={onClose}>
                Continue shopping
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
