import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandedPageHero from './BrandedPageHero'
import { apiRequest } from '../lib/api'
import { usePageMeta } from '../hooks/usePageMeta'
import { ChevronRight } from './Icons'
import './TrackOrderPage.css'

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  fulfilled: 'Fulfilled',
}

const STATUS_COPY = {
  pending: 'Your pieces are reserved and waiting for confirmation.',
  confirmed: 'Your order is confirmed and being prepared.',
  cancelled: 'This order is no longer active.',
  fulfilled: 'Your order has been fulfilled. Thanks for repping BYOC.',
}

const STEPS = [
  { status: 'pending', label: 'Pending', copy: 'Order received' },
  { status: 'confirmed', label: 'Confirmed', copy: 'Being prepared' },
  { status: 'fulfilled', label: 'Fulfilled', copy: 'On its way' },
]

const pad = (value) => String(value).padStart(2, '0')

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildTimeline(order) {
  const history = Array.isArray(order?.statusHistory) ? order.statusHistory : []
  if (history.length) return history
  return [
    {
      status: order.status || 'pending',
      at: order.createdAt,
      note: 'Order received',
    },
  ]
}

function countdownParts(expiresAt) {
  if (!expiresAt) return null
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return null
  const remainingMs = Math.max(0, date.getTime() - Date.now())
  const totalSeconds = Math.floor(remainingMs / 1000)
  return {
    remainingMs,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

export default function TrackOrderPage({ initialOrderId = '', initialEmail = '' }) {
  const navigate = useNavigate()
  const [orderId, setOrderId] = useState(initialOrderId)
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)
  const [, setTick] = useState(Date.now())

  usePageMeta({
    title: order ? `Order ${STATUS_LABEL[order.status] ?? order.status} | BYOC` : 'Track Order | BYOC',
    description: 'Track your BYOC order status with your reference and email.',
  })

  const lookup = useCallback(async (rawOrderId, rawEmail) => {
    const trimmedOrderId = String(rawOrderId)
      .trim()
      .replace(/^#\s*/, '')
    const trimmedEmail = String(rawEmail).trim().toLowerCase()

    if (!trimmedOrderId || !trimmedEmail) {
      setError('Enter your order reference and email to look it up.')
      setOrder(null)
      return
    }

    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const data = await apiRequest('/orders/lookup', {
        method: 'POST',
        body: { orderId: trimmedOrderId, email: trimmedEmail },
      })
      setOrderId(trimmedOrderId)
      setEmail(trimmedEmail)
      setOrder(data)
      setTick(Date.now())
      window.history.replaceState(
        null,
        '',
        `/order/${encodeURIComponent(trimmedOrderId)}?email=${encodeURIComponent(trimmedEmail)}`,
      )
    } catch (lookupError) {
      setOrder(null)
      setError(lookupError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault()
    lookup(orderId, email)
  }

  useEffect(() => {
    if (initialOrderId && initialEmail) lookup(initialOrderId, initialEmail)
    // Only the initial route credentials should auto-load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!order?.expiresAt || order.status !== 'pending') return undefined
    const timer = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [order?.expiresAt, order?.status])

  const resetLookup = () => {
    setOrder(null)
    setError('')
    navigate('/order', { replace: true })
  }

  const countdown = order ? countdownParts(order.expiresAt) : null
  const isPending = order?.status === 'pending'
  const isCancelled = order?.status === 'cancelled'
  const currentStep = STEPS.findIndex((step) => step.status === order?.status)
  const timeline = order ? buildTimeline(order) : []

  return (
    <div className="track-order">
      <BrandedPageHero
        eyebrow="BYOC / Order tracking"
        title="Track Order"
        accent="Status"
        subtitle="Follow your pieces from confirmation to delivery — no account needed."
      />

      <div className="container track-order__body">
        {order ? (
          <section className="track-order__result" aria-live="polite">
            <div className="track-order__result-head">
              <div>
                <p className="track-order__eyebrow">Order #{order.orderId.slice(-8)}</p>
                <h2 className="track-order__result-title">
                  <span className={`track-order__status-dot track-order__status-dot--${order.status}`} />
                  {STATUS_LABEL[order.status] ?? order.status}
                </h2>
                <p className="track-order__result-copy">
                  {STATUS_COPY[order.status] ?? 'Your order status is shown below.'}
                </p>
                <p className="track-order__meta">
                  Reference {order.orderId} · Placed {formatTime(order.createdAt)}
                </p>
              </div>
              <button type="button" className="btn btn--outline" onClick={resetLookup}>
                Track another order
              </button>
            </div>

            {isPending && countdown && (
              <div className="track-order__notice track-order__notice--hold" role="status">
                <div>
                  <strong>
                    {countdown.remainingMs === 0
                      ? 'The reservation window has ended'
                      : `Reserved for ${countdown.hours}h ${pad(countdown.minutes)}m ${pad(countdown.seconds)}s`}
                  </strong>
                  <p>
                    Your items are held until {formatTime(order.expiresAt)}. If the order is not
                    confirmed within 72 hours, it is cancelled automatically and the items are
                    released.
                  </p>
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="track-order__notice track-order__notice--cancelled" role="alert">
                <div>
                  <strong>
                    {order.cancelReason === 'expired'
                      ? 'Order cancelled automatically'
                      : 'Order cancelled'}
                  </strong>
                  <p>
                    {order.cancelReason === 'expired'
                      ? 'This order was not confirmed within 72 hours, so it was cancelled and the items were released.'
                      : order.cancelReason
                        ? `Reason: ${order.cancelReason}`
                        : 'This order is no longer active. Contact us if you have any questions.'}
                  </p>
                </div>
              </div>
            )}

            {!isCancelled && (
              <ol className="track-order__progress" aria-label="Order progress">
                {STEPS.map((step, index) => {
                  const state =
                    index < currentStep
                      ? 'is-complete'
                      : index === currentStep
                        ? 'is-current'
                        : 'is-upcoming'
                  return (
                    <li className={`track-order__progress-step ${state}`} key={step.status}>
                      <span className="track-order__progress-dot">{index + 1}</span>
                      <span className="track-order__progress-label">{step.label}</span>
                      <span className="track-order__progress-copy">{step.copy}</span>
                    </li>
                  )
                })}
              </ol>
            )}

            <div className="track-order__result-grid">
              <section className="track-order__panel" aria-labelledby="track-timeline-title">
                <p className="track-order__eyebrow">Activity</p>
                <h3 className="track-order__panel-title" id="track-timeline-title">
                  Order timeline
                </h3>
                <ol className="track-order__timeline">
                  {timeline.map((entry, index) => (
                    <li
                      className={`track-order__timeline-item${
                        index === timeline.length - 1 ? ' is-latest' : ''
                      }`}
                      key={`${entry.status}-${index}`}
                    >
                      <span className="track-order__timeline-marker" />
                      <div>
                        <p className="track-order__timeline-title">
                          {STATUS_LABEL[entry.status] ?? entry.status}
                        </p>
                        <p className="track-order__timeline-time">{formatTime(entry.at)}</p>
                        {entry.note && (
                          <p className="track-order__timeline-note">{entry.note}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <aside className="track-order__panel track-order__summary" aria-labelledby="track-summary-title">
                <p className="track-order__eyebrow">Summary</p>
                <h3 className="track-order__panel-title" id="track-summary-title">
                  Your order
                </h3>
                <ul className="track-order__items">
                  {order.items.map((item, index) => (
                    <li key={`${item.name}-${index}`}>
                      <span>
                        {item.name}
                        {item.colorway ? ` · ${item.colorway}` : ''} · {item.size}
                      </span>
                      <span>
                        {item.quantity} × {item.unitPrice} TND
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="track-order__totals">
                  <p>
                    <span>Subtotal</span>
                    <strong>{order.subtotal} TND</strong>
                  </p>
                  <p>
                    <span>Shipping</span>
                    <strong>{order.shippingFee} TND</strong>
                  </p>
                  <p className="track-order__totals-grand">
                    <span>Total</span>
                    <strong>{order.total} TND</strong>
                  </p>
                </div>
                <p className="track-order__summary-note">
                  Questions about this order? <a href="/contact">Contact us</a>.
                </p>
              </aside>
            </div>
          </section>
        ) : (
          <div className="track-order__layout">
            <section className="track-order__panel" aria-labelledby="track-form-title">
              <p className="track-order__eyebrow">Find your order</p>
              <h2 className="track-order__panel-title" id="track-form-title">
                Where is my order?
              </h2>
              <p className="track-order__lead">
                Enter the reference from your confirmation and the email you used at checkout.
              </p>

              <form className="track-order__form" onSubmit={handleSubmit}>
                <label className="track-order__field">
                  <span>Order reference</span>
                  <input
                    name="orderId"
                    value={orderId}
                    onChange={(event) => setOrderId(event.target.value)}
                    placeholder="Your order reference"
                    required
                    autoComplete="off"
                  />
                </label>
                <label className="track-order__field">
                  <span>Email</span>
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </label>
                {error && (
                  <p className="track-order__error" role="alert">
                    {error}
                  </p>
                )}
                <button type="submit" className="btn btn--lime track-order__submit" disabled={loading}>
                  {loading ? 'Checking…' : 'Track order'}
                </button>
              </form>

              <p className="track-order__form-note">
                Paste the full reference from your confirmation email or the checkout success
                screen. A leading <strong>#</strong> is fine.
              </p>
            </section>

            <aside className="track-order__aside" aria-label="Order tracking help">
              <section className="track-order__panel">
                <p className="track-order__eyebrow">How it works</p>
                <h2 className="track-order__panel-title">Three quick steps</h2>
                <ol className="track-order__help-steps">
                  <li>
                    <span>01</span>
                    <div>
                      <h3>Enter your reference</h3>
                      <p>Use the order reference from your confirmation.</p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <h3>Confirm your email</h3>
                      <p>We match the email used when the order was placed.</p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <h3>Follow the status</h3>
                      <p>See every update from pending to fulfilled.</p>
                    </div>
                  </li>
                </ol>
              </section>

              <section className="track-order__panel track-order__panel--help">
                <p className="track-order__eyebrow">Need a hand?</p>
                <h2 className="track-order__panel-title">We can help</h2>
                <p className="track-order__lead">
                  Lost your reference or using a different email? Our team can look it up for you.
                </p>
                <a className="track-order__link" href="/contact">
                  Contact support
                  <ChevronRight size={12} strokeWidth={2} />
                </a>
                <a className="track-order__link" href="/account">
                  View your account
                  <ChevronRight size={12} strokeWidth={2} />
                </a>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
