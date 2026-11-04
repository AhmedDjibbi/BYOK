import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
import { usePageMeta } from '../hooks/usePageMeta'
import { ChevronRight } from './Icons'
import './AccountPage.css'

const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const perks = [
  {
    title: 'Track every order',
    text: 'Follow your pieces from confirmation to delivery in real time.',
  },
  {
    title: 'Save what you love',
    text: 'Keep a wishlist synced to your account, on every device.',
  },
  {
    title: 'Move faster',
    text: 'Skip the forms at checkout with your details ready to go.',
  },
]

export default function AccountPage({
  currentUser = null,
  authLoading = false,
  wishlistCount = 0,
  onAuthChange = () => {},
}) {
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  usePageMeta({ title: 'Account | BYOC', description: 'Your BYOC account and order history.' })

  useEffect(() => {
    if (!currentUser) return undefined

    let cancelled = false
    setOrdersLoading(true)
    apiRequest('/account/orders', { credentials: 'include' })
      .then((data) => {
        if (!cancelled) setOrders(data.orders ?? [])
      })
      .catch((loadError) => {
        if (cancelled) return
        if (loadError.status === 401) {
          setOrders([])
          onAuthChange(null)
        } else {
          setError(loadError.message)
        }
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentUser, onAuthChange])

  const login = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSubmitting(true)
    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
        credentials: 'include',
      })
      setPassword('')
      onAuthChange(result.user)
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const logout = async () => {
    setError('')
    setNotice('')
    try {
      await apiRequest('/auth/logout', { method: 'POST', credentials: 'include' })
      setOrders([])
      onAuthChange(null)
    } catch (logoutError) {
      setError(logoutError.message)
    }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest('/account/profile', {
        method: 'PATCH',
        body: { name: formData.get('name') },
        credentials: 'include',
        headers: { 'x-csrf-token': getCsrfToken() },
      })
      onAuthChange(result.user)
      setNotice('Profile updated.')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  const isSignedIn = Boolean(currentUser)

  return (
    <main className="account-page">
      <header className="account-hero">
        <div className="account-hero__photo" aria-hidden="true" />
        <div className="account-hero__scrim" aria-hidden="true" />

        <div className="container account-hero__inner">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <ChevronRight size={10} strokeWidth={2} />
            <span aria-current="page">Account</span>
          </nav>
          <p className="account-hero__eyebrow">BYOC / Members</p>
          <h1 className="account-hero__title">
            {isSignedIn ? 'Welcome' : 'Your account'}
            <span>{isSignedIn ? 'Back' : 'Sign in'}</span>
          </h1>
          <p className="account-hero__tag">
            {isSignedIn
              ? currentUser.email
              : 'Sign in with your email and password, or create an account in seconds.'}
          </p>
        </div>
      </header>

      <div className="container account-page__body">
        {authLoading ? (
          <section className="account-panel account-panel--loading" aria-busy="true">
            <p className="account-panel__eyebrow">Account</p>
            <p className="account-panel__lead">Loading your account…</p>
          </section>
        ) : !isSignedIn ? (
          <div className="account-layout">
            <section className="account-panel" aria-labelledby="account-signin-title">
              <p className="account-panel__eyebrow">Members sign in</p>
              <h2 className="account-panel__title" id="account-signin-title">
                Welcome back
              </h2>
              <p className="account-panel__lead">
                Enter your email and password to access your orders and wishlist.
              </p>

              {error && (
                <p className="account-alert account-alert--error" role="alert">
                  {error}
                </p>
              )}

              <form className="account-form" onSubmit={login}>
                <label className="account-field">
                  <span>Email</span>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="account-field">
                  <span>Password</span>
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn--lime account-form__submit"
                  disabled={submitting}
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="account-auth-switch">
                New to BYOC? <a href="/register">Create an account</a>
              </p>
            </section>

            <aside className="account-aside" aria-label="Account benefits">
              <p className="account-panel__eyebrow">Why sign in</p>
              <ul className="account-perks">
                {perks.map((perk, index) => (
                  <li className="account-perk" key={perk.title}>
                    <span className="account-perk__index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="account-perk__body">
                      <h3 className="account-perk__title">{perk.title}</h3>
                      <p className="account-perk__text">{perk.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        ) : (
          <div className="account-layout account-layout--member">
            <section className="account-panel" aria-labelledby="account-profile-title">
              <div className="account-panel__head">
                <div>
                  <p className="account-panel__eyebrow">Profile</p>
                  <h2 className="account-panel__title" id="account-profile-title">
                    Your details
                  </h2>
                </div>
                <button type="button" className="btn btn--outline account-panel__action" onClick={logout}>
                  Sign out
                </button>
              </div>

              <form className="account-form" onSubmit={saveProfile}>
                <label className="account-field">
                  <span>Name</span>
                  <input name="name" defaultValue={currentUser.name ?? ''} autoComplete="name" />
                </label>
                <label className="account-field">
                  <span>Email</span>
                  <input type="email" value={currentUser.email} readOnly disabled />
                </label>
                <button type="submit" className="btn btn--lime account-form__submit">
                  Save profile
                </button>
              </form>

              {error && (
                <p className="account-alert account-alert--error" role="alert">
                  {error}
                </p>
              )}
              {notice && (
                <p className="account-alert account-alert--success" role="status">
                  {notice}
                </p>
              )}
            </section>

            <section className="account-panel account-panel--compact" aria-labelledby="account-wishlist-title">
              <p className="account-panel__eyebrow">Saved</p>
              <h2 className="account-panel__title" id="account-wishlist-title">
                Wishlist
              </h2>
              <p className="account-wishlist__count">{wishlistCount}</p>
              <p className="account-panel__lead">
                {wishlistCount === 1
                  ? 'piece saved to your account'
                  : 'pieces saved to your account'}
              </p>
              <a className="account-inline-link" href="/wishlist">
                View wishlist
                <ChevronRight size={12} strokeWidth={2} />
              </a>
            </section>

            <section
              className="account-panel account-panel--wide"
              aria-labelledby="account-orders-title"
            >
              <p className="account-panel__eyebrow">History</p>
              <h2 className="account-panel__title" id="account-orders-title">
                Order history
              </h2>

              {ordersLoading ? (
                <p className="account-empty">Loading your orders…</p>
              ) : !orders.length ? (
                <p className="account-empty">No orders are linked to this account yet.</p>
              ) : (
                <ul className="account-orders">
                  <li className="account-orders__head" aria-hidden="true">
                    <span>Order</span>
                    <span>Status</span>
                    <span>Total</span>
                    <span />
                  </li>
                  {orders.map((order) => (
                    <li className="account-order" key={order.orderId}>
                      <a className="account-order__id" href={`/order/${order.orderId}`}>
                        #{order.orderId.slice(-8)}
                      </a>
                      <span className={`account-order__status is-${String(order.status).toLowerCase()}`}>
                        {order.status}
                      </span>
                      <span className="account-order__total">{order.total} TND</span>
                      <a className="account-inline-link" href={`/order/${order.orderId}`}>
                        Track
                        <ChevronRight size={12} strokeWidth={2} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
