import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { usePageMeta } from '../hooks/usePageMeta'
import { ChevronRight } from './Icons'
import './AccountPage.css'

export default function RegisterPage({ currentUser = null, onAuthChange = () => {} }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  usePageMeta({
    title: 'Create account | BYOC',
    description: 'Create your BYOC account and start tracking orders.',
  })

  useEffect(() => {
    if (currentUser) navigate('/account', { replace: true })
  }, [currentUser, navigate])

  const register = async (event) => {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Your password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: { name: name.trim(), email: email.trim(), password },
        credentials: 'include',
      })
      onAuthChange(result.user)
      navigate('/account', { replace: true })
    } catch (registerError) {
      setError(registerError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="account-page">
      <header className="account-hero">
        <div className="account-hero__photo" aria-hidden="true" />
        <div className="account-hero__scrim" aria-hidden="true" />

        <div className="container account-hero__inner">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href="/account">Account</a>
            <ChevronRight size={10} strokeWidth={2} />
            <span aria-current="page">Create account</span>
          </nav>
          <p className="account-hero__eyebrow">BYOC / Members</p>
          <h1 className="account-hero__title">
            Create
            <span>Account</span>
          </h1>
          <p className="account-hero__tag">
            One account for your orders, wishlist and a faster checkout.
          </p>
        </div>
      </header>

      <div className="container account-page__body">
        <div className="account-layout">
          <section className="account-panel" aria-labelledby="account-register-title">
            <p className="account-panel__eyebrow">New member</p>
            <h2 className="account-panel__title" id="account-register-title">
              Join BYOC
            </h2>
            <p className="account-panel__lead">
              Set up your account in seconds. All you need is an email and a password.
            </p>

            {error && (
              <p className="account-alert account-alert--error" role="alert">
                {error}
              </p>
            )}

            <form className="account-form" onSubmit={register}>
              <label className="account-field">
                <span>Name</span>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </label>
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
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>
              <label className="account-field">
                <span>Confirm password</span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>
              <button
                type="submit"
                className="btn btn--lime account-form__submit"
                disabled={submitting}
              >
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p className="account-auth-switch">
              Already have an account? <a href="/account">Sign in</a>
            </p>
          </section>

          <aside className="account-aside" aria-label="Member benefits">
            <div className="account-panel account-register__panel">
              <p className="account-panel__eyebrow">Members</p>
              <h2 className="account-panel__title">Already with us?</h2>
              <p className="account-panel__lead">
                Sign in to pick up where you left off, review your orders and manage your saved
                pieces.
              </p>
              <a className="account-inline-link" href="/account">
                Sign in
                <ChevronRight size={12} strokeWidth={2} />
              </a>
            </div>

            <ul className="account-perks">
              <li className="account-perk">
                <span className="account-perk__index">01</span>
                <div className="account-perk__body">
                  <h3 className="account-perk__title">Track every order</h3>
                  <p className="account-perk__text">
                    Follow your pieces from confirmation to delivery in real time.
                  </p>
                </div>
              </li>
              <li className="account-perk">
                <span className="account-perk__index">02</span>
                <div className="account-perk__body">
                  <h3 className="account-perk__title">Save what you love</h3>
                  <p className="account-perk__text">
                    Keep a wishlist synced to your account, on every device.
                  </p>
                </div>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </main>
  )
}
